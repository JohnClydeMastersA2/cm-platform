package dev.cmplatform.healthcaretransform.source;

public class SourceDocumentNotFoundException extends RuntimeException {
  public SourceDocumentNotFoundException(String sourceId) {
    super("Source document not found: " + sourceId);
  }
}
