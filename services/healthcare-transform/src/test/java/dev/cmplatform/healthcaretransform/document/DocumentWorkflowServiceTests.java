package dev.cmplatform.healthcaretransform.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import dev.cmplatform.healthcaretransform.source.SourceDocument;
import dev.cmplatform.healthcaretransform.source.SourceDocumentCatalog;
import dev.cmplatform.healthcaretransform.x12.X12835ParsingService;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.ObjectMapper;

class DocumentWorkflowServiceTests {
  private ArtifactRepository artifactRepository;
  private SubmissionRepository submissionRepository;
  private SourceDocumentCatalog sourceDocumentCatalog;
  private DocumentWorkflowService workflowService;

  @BeforeEach
  void setUp() {
    artifactRepository = mock(ArtifactRepository.class);
    submissionRepository = mock(SubmissionRepository.class);
    sourceDocumentCatalog = mock(SourceDocumentCatalog.class);
    when(artifactRepository.save(any(Artifact.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(submissionRepository.save(any(Submission.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(sourceDocumentCatalog.findBySha256(any())).thenReturn(Optional.empty());
    workflowService = new DocumentWorkflowService(
        artifactRepository,
        submissionRepository,
        new X12835ParsingService(),
        sourceDocumentCatalog,
        new ObjectMapper(),
        10 * 1024 * 1024,
        true);
  }

  @Test
  void valid835CreatesOriginalAndTransformedArtifacts() throws IOException {
    byte[] content = new ClassPathResource("x12/835/minimal-835.edi").getContentAsByteArray();
    var file = new MockMultipartFile("file", "minimal-835.edi", "text/plain", content);

    Submission result = workflowService.submit(file);

    assertThat(result.getStatus()).isEqualTo(SubmissionStatus.COMPLETED);
    assertThat(result.getOriginalArtifactId()).isNotBlank();
    assertThat(result.getTransformedArtifactId()).isNotBlank();
    assertThat(result.getErrors()).isEmpty();

    ArgumentCaptor<Artifact> artifactCaptor = ArgumentCaptor.forClass(Artifact.class);
    verify(artifactRepository, times(2)).save(artifactCaptor.capture());
    List<Artifact> artifacts = artifactCaptor.getAllValues();
    assertThat(artifacts).extracting(Artifact::kind)
        .containsExactly(ArtifactKind.ORIGINAL, ArtifactKind.TRANSFORMED);
    assertThat(artifacts.get(0).data()).isEqualTo(content);
    assertThat(new String(artifacts.get(1).data())).contains("\"paymentAmount\":\"1500.00\"");
    verify(submissionRepository, times(4)).save(any(Submission.class));
  }

  @Test
  void malformedDocumentIsRejectedBeforePersistence() {
    var file = new MockMultipartFile("file", "invalid.txt", "text/plain", "not x12".getBytes());

    assertThatThrownBy(() -> workflowService.submit(file))
        .isInstanceOf(InvalidDocumentException.class)
        .hasMessageContaining("missing ISA");

    verify(artifactRepository, never()).save(any());
    verify(submissionRepository, never()).save(any());
  }

  @Test
  void oversizedDocumentIsRejectedBeforePersistence() {
    var file = new MockMultipartFile("file", "large.edi", "text/plain", new byte[101]);
    workflowService = new DocumentWorkflowService(
        artifactRepository,
        submissionRepository,
        new X12835ParsingService(),
        sourceDocumentCatalog,
        new ObjectMapper(),
        100,
        true);

    assertThatThrownBy(() -> workflowService.submit(file))
        .isInstanceOf(InvalidDocumentException.class)
        .hasMessageContaining("10 MiB");

    verify(artifactRepository, never()).save(any());
    verify(submissionRepository, never()).save(any());
  }

  @Test
  void transformationFailureIsPersisted() {
    var parser = mock(X12835ParsingService.class);
    when(parser.parse(any())).thenThrow(new IllegalStateException("parser unavailable"));
    workflowService = new DocumentWorkflowService(
        artifactRepository,
        submissionRepository,
        parser,
        sourceDocumentCatalog,
        new ObjectMapper(),
        10 * 1024 * 1024,
        true);
    var file = new MockMultipartFile(
        "file",
        "failure.edi",
        "text/plain",
        "ISA*00*~ST*835*0001~".getBytes());

    Submission result = workflowService.submit(file);

    assertThat(result.getStatus()).isEqualTo(SubmissionStatus.FAILED);
    assertThat(result.getErrors()).containsExactly("parser unavailable");
    verify(artifactRepository, times(1)).save(any(Artifact.class));
    verify(submissionRepository, times(4)).save(any(Submission.class));
  }

  @Test
  void listAndGetDelegateToSubmissionRepository() {
    Submission submission = submission("submission-1");
    when(submissionRepository.findTop50ByOrderByCreatedAtDesc()).thenReturn(List.of(submission));
    when(submissionRepository.findById("submission-1")).thenReturn(java.util.Optional.of(submission));

    assertThat(workflowService.list()).containsExactly(submission);
    assertThat(workflowService.get("submission-1")).isSameAs(submission);
  }

  @Test
  void getRejectsUnknownSubmission() {
    when(submissionRepository.findById("missing")).thenReturn(java.util.Optional.empty());

    assertThatThrownBy(() -> workflowService.get("missing"))
        .isInstanceOf(DocumentNotFoundException.class)
        .hasMessageContaining("missing");
  }

  @Test
  void unapprovedUploadIsRejectedBeforePersistenceWithSafeDetails() throws IOException {
    byte[] content = new ClassPathResource("x12/835/minimal-835.edi").getContentAsByteArray();
    workflowService = new DocumentWorkflowService(
        artifactRepository,
        submissionRepository,
        new X12835ParsingService(),
        sourceDocumentCatalog,
        new ObjectMapper(),
        10 * 1024 * 1024,
        false);
    var file = new MockMultipartFile("file", "minimal-835.edi", "text/plain", content);

    assertThatThrownBy(() -> workflowService.submit(file))
        .isInstanceOf(UnapprovedSourceDocumentException.class)
        .satisfies(exception -> {
          var details = ((UnapprovedSourceDocumentException) exception).details();
          assertThat(details.filename()).isEqualTo("minimal-835.edi");
          assertThat(details.contentType()).isEqualTo("text/plain");
          assertThat(details.size()).isEqualTo(content.length);
          assertThat(details.sha256()).hasSize(64);
          assertThat(details.documentType()).isEqualTo("X12_835");
          assertThat(details.receivedAt()).isNotNull();
        });

    verify(artifactRepository, never()).save(any());
    verify(submissionRepository, never()).save(any());
  }

  @Test
  void sourceDocumentProcessingUsesCatalogAndDedupeKey() throws IOException {
    byte[] content = new ClassPathResource("x12/835/minimal-835.edi").getContentAsByteArray();
    SourceDocument sourceDocument = new SourceDocument(
        "sample-source",
        "Sample Source",
        "minimal-835.edi",
        "X12_835",
        "x12/835/minimal-835.edi",
        "2d980982f6cf1e990d158da5f7343d1ee2153db052e5b6647bd133f598655333",
        "CM Platform",
        "https://cmplatform.dev",
        "Minimal synthetic fixture.",
        "Basic parser smoke test",
        true);
    when(sourceDocumentCatalog.get("sample-source")).thenReturn(sourceDocument);
    when(sourceDocumentCatalog.readBytes(sourceDocument)).thenReturn(content);
    when(submissionRepository
        .findFirstBySourceDocumentIdAndSourceSha256AndParserVersionAndStatusOrderByCreatedAtAsc(
            any(),
            any(),
            any(),
            any()))
        .thenReturn(Optional.empty());

    Submission result = workflowService.submitSourceDocument("sample-source");

    assertThat(result.getStatus()).isEqualTo(SubmissionStatus.COMPLETED);
    assertThat(result.getSourceDocumentId()).isEqualTo("sample-source");
    assertThat(result.getSourceSha256()).isEqualTo(sourceDocument.sha256());
    assertThat(result.getParserVersion()).isEqualTo("x12-835-parser-v1");
    verify(artifactRepository, times(2)).save(any(Artifact.class));
  }

  @Test
  void sourceDocumentProcessingReturnsExistingCompletedSubmission() throws IOException {
    byte[] content = new ClassPathResource("x12/835/minimal-835.edi").getContentAsByteArray();
    SourceDocument sourceDocument = new SourceDocument(
        "sample-source",
        "Sample Source",
        "minimal-835.edi",
        "X12_835",
        "x12/835/minimal-835.edi",
        "2d980982f6cf1e990d158da5f7343d1ee2153db052e5b6647bd133f598655333",
        "CM Platform",
        "https://cmplatform.dev",
        "Minimal synthetic fixture.",
        "Basic parser smoke test",
        true);
    Submission existing = submission("existing-submission");
    when(sourceDocumentCatalog.get("sample-source")).thenReturn(sourceDocument);
    when(sourceDocumentCatalog.readBytes(sourceDocument)).thenReturn(content);
    when(submissionRepository
        .findFirstBySourceDocumentIdAndSourceSha256AndParserVersionAndStatusOrderByCreatedAtAsc(
            "sample-source",
            sourceDocument.sha256(),
            "x12-835-parser-v1",
            SubmissionStatus.COMPLETED))
        .thenReturn(Optional.of(existing));

    Submission result = workflowService.submitSourceDocument("sample-source");

    assertThat(result).isSameAs(existing);
    verify(artifactRepository, never()).save(any());
  }

  private Submission submission(String id) {
    var now = java.time.Instant.now();
    return new Submission(
        id,
        "sample.edi",
        "X12_835",
        null,
        null,
        "x12-835-parser-v1",
        SubmissionStatus.COMPLETED,
        "original",
        "transformed",
        now,
        now,
        new ArrayList<>(),
        new ArrayList<>());
  }
}
