package dev.cmplatform.healthcaretransform.document;

import dev.cmplatform.healthcaretransform.api.dto.Parse835Request;
import dev.cmplatform.healthcaretransform.api.dto.Parse835Response;
import dev.cmplatform.healthcaretransform.source.SourceDocument;
import dev.cmplatform.healthcaretransform.source.SourceDocumentCatalog;
import dev.cmplatform.healthcaretransform.x12.X12835ParsingService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentWorkflowService {
  private static final String PARSER_VERSION = "x12-835-parser-v1";

  private final ArtifactRepository artifactRepository;
  private final SubmissionRepository submissionRepository;
  private final X12835ParsingService parsingService;
  private final SourceDocumentCatalog sourceDocumentCatalog;
  private final ObjectMapper objectMapper;
  private final long maxUploadBytes;
  private final boolean allowUnapprovedUploads;

  public DocumentWorkflowService(
      ArtifactRepository artifactRepository,
      SubmissionRepository submissionRepository,
      X12835ParsingService parsingService,
      SourceDocumentCatalog sourceDocumentCatalog,
      ObjectMapper objectMapper,
      @Value("${healthcare-transform.uploads.max-bytes}") long maxUploadBytes,
      @Value("${healthcare-transform.uploads.allow-unapproved:false}") boolean allowUnapprovedUploads) {
    this.artifactRepository = artifactRepository;
    this.submissionRepository = submissionRepository;
    this.parsingService = parsingService;
    this.sourceDocumentCatalog = sourceDocumentCatalog;
    this.objectMapper = objectMapper;
    this.maxUploadBytes = maxUploadBytes;
    this.allowUnapprovedUploads = allowUnapprovedUploads;
  }

  public Submission submit(MultipartFile file) {
    Instant receivedAt = Instant.now();
    byte[] original = readAndValidate(file);
    String filename = safeFilename(file);
    String contentType = normalizeContentType(file.getContentType());
    String sha256 = sha256(original);
    String content = new String(original, StandardCharsets.UTF_8);
    validate835(content);
    SourceDocument sourceDocument = resolveApprovedSource(new UploadAttemptDetails(
        receivedAt,
        filename,
        contentType,
        original.length,
        sha256,
        "X12_835"));

    return process(sourceDocument, original, filename, contentType, sha256, content);
  }

  public Submission submitSourceDocument(String sourceId) {
    SourceDocument sourceDocument = sourceDocumentCatalog.get(sourceId);
    byte[] original = sourceDocumentCatalog.readBytes(sourceDocument);
    String sha256 = sha256(original);
    if (!sourceDocument.sha256().equals(sha256)) {
      throw new IllegalStateException("Curated source document hash does not match manifest: " + sourceId);
    }
    String content = new String(original, StandardCharsets.UTF_8);
    validate835(content);
    return process(
        sourceDocument,
        original,
        sourceDocument.filename(),
        "text/plain",
        sha256,
        content);
  }

  private Submission process(
      SourceDocument sourceDocument,
      byte[] original,
      String filename,
      String contentType,
      String sha256,
      String content) {
    if (sourceDocument != null) {
      var existing = submissionRepository
          .findFirstBySourceDocumentIdAndSourceSha256AndParserVersionAndStatusOrderByCreatedAtAsc(
              sourceDocument.sourceId(),
              sha256,
              PARSER_VERSION,
              SubmissionStatus.COMPLETED);
      if (existing.isPresent()) {
        return existing.get();
      }
    }

    Instant now = Instant.now();
    String submissionId = UUID.randomUUID().toString();
    String originalArtifactId = UUID.randomUUID().toString();

    Artifact originalArtifact = new Artifact(
        originalArtifactId,
        submissionId,
        ArtifactKind.ORIGINAL,
        filename,
        contentType,
        original.length,
        sha256,
        original,
        now);
    artifactRepository.save(originalArtifact);

    Submission submission = new Submission(
        submissionId,
        filename,
        "X12_835",
        sourceDocument == null ? null : sourceDocument.sourceId(),
        sourceDocument == null ? null : sha256,
        PARSER_VERSION,
        SubmissionStatus.RECEIVED,
        originalArtifactId,
        null,
        now,
        now,
        List.of(),
        List.of());
    submissionRepository.save(submission);

    try {
      submission.advance(SubmissionStatus.VALIDATING);
      submissionRepository.save(submission);
      submission.advance(SubmissionStatus.PROCESSING);
      submissionRepository.save(submission);

      Parse835Response parsed = parsingService.parse(new Parse835Request(content, filename));
      byte[] transformed = objectMapper.writeValueAsBytes(parsed.parsed());
      if (transformed.length > maxUploadBytes) {
        throw new IllegalStateException("Transformed artifact exceeds the configured artifact size limit.");
      }

      String transformedArtifactId = UUID.randomUUID().toString();
      artifactRepository.save(new Artifact(
          transformedArtifactId,
          submissionId,
          ArtifactKind.TRANSFORMED,
          filename + ".json",
          "application/json",
          transformed.length,
          sha256(transformed),
          transformed,
          Instant.now()));
      submission.complete(transformedArtifactId, parsed.warnings());
      return submissionRepository.save(submission);
    } catch (RuntimeException exception) {
      submission.fail(safeError(exception));
      submissionRepository.save(submission);
      return submission;
    }
  }

  public List<Submission> list() {
    return submissionRepository.findTop50ByOrderByCreatedAtDesc();
  }

  public Submission get(String id) {
    return submissionRepository.findById(id).orElseThrow(() -> new DocumentNotFoundException(id));
  }

  private byte[] readAndValidate(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new InvalidDocumentException("A non-empty file is required.");
    }
    if (file.getSize() > maxUploadBytes) {
      throw new InvalidDocumentException("File exceeds the 10 MiB upload limit.");
    }
    try {
      byte[] bytes = file.getBytes();
      if (bytes.length > maxUploadBytes) {
        throw new InvalidDocumentException("File exceeds the 10 MiB upload limit.");
      }
      return bytes;
    } catch (java.io.IOException exception) {
      throw new InvalidDocumentException("The uploaded file could not be read.");
    }
  }

  private void validate835(String content) {
    String normalized = content.stripLeading();
    if (!normalized.startsWith("ISA*")) {
      throw new InvalidDocumentException("The file is not an ASC X12 interchange: missing ISA segment.");
    }
    if (!normalized.contains("ST*835*")) {
      throw new InvalidDocumentException("The file is not an ASC X12 835 transaction.");
    }
  }

  private SourceDocument resolveApprovedSource(UploadAttemptDetails details) {
    return sourceDocumentCatalog.findBySha256(details.sha256()).orElseGet(() -> {
      if (allowUnapprovedUploads) {
        return null;
      }
      throw new UnapprovedSourceDocumentException(details);
    });
  }

  private String safeFilename(MultipartFile file) {
    String name = file.getOriginalFilename();
    if (name == null || name.isBlank()) {
      return "upload.edi";
    }
    name = name.replace('\\', '/');
    return name.substring(name.lastIndexOf('/') + 1);
  }

  private String normalizeContentType(String contentType) {
    return contentType == null || contentType.isBlank() ? "application/octet-stream" : contentType;
  }

  private String sha256(byte[] data) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is unavailable.", exception);
    }
  }

  private String safeError(Exception exception) {
    String message = exception.getMessage();
    return message == null || message.isBlank() ? "Document transformation failed." : message;
  }
}
