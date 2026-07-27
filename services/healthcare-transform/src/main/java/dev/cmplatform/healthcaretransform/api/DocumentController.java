package dev.cmplatform.healthcaretransform.api;

import dev.cmplatform.healthcaretransform.api.dto.SubmissionResponse;
import dev.cmplatform.healthcaretransform.document.Artifact;
import dev.cmplatform.healthcaretransform.document.DocumentWorkflowService;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {
  private final DocumentWorkflowService workflowService;

  public DocumentController(DocumentWorkflowService workflowService) {
    this.workflowService = workflowService;
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public SubmissionResponse submit(@RequestPart("file") MultipartFile file) {
    return SubmissionResponse.from(workflowService.submit(file));
  }

  @GetMapping
  public List<SubmissionResponse> list() {
    return workflowService.list().stream().map(SubmissionResponse::from).toList();
  }

  @GetMapping("/{id}")
  public SubmissionResponse get(@PathVariable String id) {
    return SubmissionResponse.from(workflowService.get(id));
  }

  @GetMapping("/{id}/raw")
  public ResponseEntity<byte[]> getRaw(@PathVariable String id) {
    return artifactResponse(workflowService.getRawArtifact(id));
  }

  @GetMapping("/{id}/json")
  public ResponseEntity<byte[]> getJson(@PathVariable String id) {
    return artifactResponse(workflowService.getTransformedArtifact(id));
  }

  private ResponseEntity<byte[]> artifactResponse(Artifact artifact) {
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(artifact.contentType()))
        .contentLength(artifact.size())
        .header(
            org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.inline().filename(artifact.filename()).build().toString())
        .body(artifact.data());
  }
}
