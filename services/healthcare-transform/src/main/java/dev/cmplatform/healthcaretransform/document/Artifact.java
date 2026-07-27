package dev.cmplatform.healthcaretransform.document;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("artifacts")
@CompoundIndex(
    name = "submission_kind_unique",
    def = "{'submissionId': 1, 'kind': 1}",
    unique = true)
public record Artifact(
    @Id String id,
    String submissionId,
    ArtifactKind kind,
    String filename,
    String contentType,
    long size,
    String sha256,
    byte[] data,
    Instant createdAt) {}
