package dev.cmplatform.healthcaretransform.document;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SubmissionRepository extends MongoRepository<Submission, String> {
  List<Submission> findTop50ByOrderByCreatedAtDesc();

  Optional<Submission> findFirstBySourceDocumentIdAndSourceSha256AndParserVersionAndStatusOrderByCreatedAtAsc(
      String sourceDocumentId,
      String sourceSha256,
      String parserVersion,
      SubmissionStatus status);
}
