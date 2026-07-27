package dev.cmplatform.healthcaretransform.api.dto;

import dev.cmplatform.healthcaretransform.source.SourceDocument;

public record SourceDocumentResponse(
    String sourceId,
    String title,
    String filename,
    String documentType,
    String sha256,
    String sourceName,
    String sourceUrl,
    String description,
    String primaryTestValue,
    boolean deidentified) {

  public static SourceDocumentResponse from(SourceDocument document) {
    return new SourceDocumentResponse(
        document.sourceId(),
        document.title(),
        document.filename(),
        document.documentType(),
        document.sha256(),
        document.sourceName(),
        document.sourceUrl(),
        document.description(),
        document.primaryTestValue(),
        document.deidentified());
  }
}
