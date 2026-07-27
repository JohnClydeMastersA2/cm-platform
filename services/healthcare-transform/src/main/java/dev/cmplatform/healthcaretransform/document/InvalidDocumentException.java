package dev.cmplatform.healthcaretransform.document;

public class InvalidDocumentException extends RuntimeException {
  public InvalidDocumentException(String message) {
    super(message);
  }
}
