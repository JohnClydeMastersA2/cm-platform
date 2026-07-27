package dev.cmplatform.healthcaretransform.document;

public class UnapprovedSourceDocumentException extends RuntimeException {
  private final UploadAttemptDetails details;

  public UnapprovedSourceDocumentException(UploadAttemptDetails details) {
    super("Uploaded healthcare documents are not accepted in this public demo. Choose one of the curated source 835 files instead.");
    this.details = details;
  }

  public UploadAttemptDetails details() {
    return details;
  }
}
