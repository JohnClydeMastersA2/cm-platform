package dev.cmplatform.healthcaretransform.api.dto;

import java.time.Instant;

public record Parse835Response(
    String documentId,
    String family,
    String documentType,
    String status,
    String parserStatus,
    int characterCount,
    String sourceFilename,
    Instant receivedAt) {}
