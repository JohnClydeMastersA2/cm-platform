package dev.cmplatform.healthcaretransform.document;

public class ArtifactNotFoundException extends RuntimeException {
  public ArtifactNotFoundException(String submissionId, ArtifactKind kind) {
    super("Artifact not found for submission " + submissionId + " and kind " + kind + ".");
  }
}
