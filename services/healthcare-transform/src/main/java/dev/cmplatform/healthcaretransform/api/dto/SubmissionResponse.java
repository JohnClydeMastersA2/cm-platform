package dev.cmplatform.healthcaretransform.api.dto;

import dev.cmplatform.healthcaretransform.document.Submission;
import dev.cmplatform.healthcaretransform.document.SubmissionStatus;
import java.time.Instant;
import java.util.List;

public record SubmissionResponse(
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

  public static SubmissionResponse from(Submission submission) {
    return new SubmissionResponse(
        submission.getId(),
        submission.getFilename(),
        submission.getDocumentType(),
        submission.getSourceDocumentId(),
        submission.getSourceSha256(),
        submission.getParserVersion(),
        submission.getStatus(),
        submission.getOriginalArtifactId(),
        submission.getTransformedArtifactId(),
        submission.getCreatedAt(),
        submission.getUpdatedAt(),
        submission.getWarnings(),
        submission.getErrors());
  }
}
