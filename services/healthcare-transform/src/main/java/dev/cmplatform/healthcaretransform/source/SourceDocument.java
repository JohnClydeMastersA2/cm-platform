package dev.cmplatform.healthcaretransform.source;

public record SourceDocument(
    String sourceId,
    String displayName,
    String title,
    String filename,
    String documentType,
    String resourcePath,
    String sha256,
    String sourceName,
    String sourceUrl,
    String description,
    String primaryTestValue,
    boolean deidentified) {}
