package dev.cmplatform.healthcaretransform.document;

public class DocumentNotFoundException extends RuntimeException {
  public DocumentNotFoundException(String id) {
    super("Submission not found: " + id);
  }
}
