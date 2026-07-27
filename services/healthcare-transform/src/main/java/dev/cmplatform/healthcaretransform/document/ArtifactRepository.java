package dev.cmplatform.healthcaretransform.document;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ArtifactRepository extends MongoRepository<Artifact, String> {
  List<Artifact> findBySubmissionIdOrderByCreatedAtAsc(String submissionId);

  Optional<Artifact> findBySubmissionIdAndKind(String submissionId, ArtifactKind kind);
}
