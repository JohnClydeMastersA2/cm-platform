package dev.cmplatform.healthcaretransform.document;

import java.time.Instant;

public record UploadAttemptDetails(
    Instant receivedAt,
    String filename,
    String contentType,
    long size,
    String sha256,
    String documentType) {}
