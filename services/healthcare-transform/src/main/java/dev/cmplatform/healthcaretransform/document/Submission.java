package dev.cmplatform.healthcaretransform.document;

import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("submissions")
@CompoundIndexes({
    @CompoundIndex(name = "created_desc", def = "{'createdAt': -1}"),
    @CompoundIndex(name = "status_created", def = "{'status': 1, 'createdAt': 1}"),
    @CompoundIndex(
        name = "source_parser_lookup",
        def = "{'sourceDocumentId': 1, 'sourceSha256': 1, 'parserVersion': 1, 'status': 1}")
})
public class Submission {
  @Id
  private String id;
  private String filename;
  private String documentType;
  private String sourceDocumentId;
  private String sourceSha256;
  private String parserVersion;
  private SubmissionStatus status;
  private String originalArtifactId;
  private String transformedArtifactId;
  private Instant createdAt;
  private Instant updatedAt;
  private List<String> warnings;
  private List<String> errors;

  public Submission(
      String id,
      String filename,
      String documentType,
      String sourceDocumentId,
      String sourceSha256,
      String parserVersion,
      SubmissionStatus status,
      String originalArtifactId,
      String transformedArtifactId,
      Instant createdAt,
      Instant updatedAt,
      List<String> warnings,
      List<String> errors) {
    this.id = id;
    this.filename = filename;
    this.documentType = documentType;
    this.sourceDocumentId = sourceDocumentId;
    this.sourceSha256 = sourceSha256;
    this.parserVersion = parserVersion;
    this.status = status;
    this.originalArtifactId = originalArtifactId;
    this.transformedArtifactId = transformedArtifactId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.warnings = warnings;
    this.errors = errors;
  }

  public String getId() {
    return id;
  }

  public String getFilename() {
    return filename;
  }

  public String getDocumentType() {
    return documentType;
  }

  public String getSourceDocumentId() {
    return sourceDocumentId;
  }

  public String getSourceSha256() {
    return sourceSha256;
  }

  public String getParserVersion() {
    return parserVersion;
  }

  public SubmissionStatus getStatus() {
    return status;
  }

  public String getOriginalArtifactId() {
    return originalArtifactId;
  }

  public String getTransformedArtifactId() {
    return transformedArtifactId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public List<String> getWarnings() {
    return warnings;
  }

  public List<String> getErrors() {
    return errors;
  }

  public void advance(SubmissionStatus status) {
    this.status = status;
    this.updatedAt = Instant.now();
  }

  public void complete(String transformedArtifactId, List<String> warnings) {
    this.transformedArtifactId = transformedArtifactId;
    this.warnings = List.copyOf(warnings);
    advance(SubmissionStatus.COMPLETED);
  }

  public void fail(String error) {
    this.errors = List.of(error);
    advance(SubmissionStatus.FAILED);
  }
}
