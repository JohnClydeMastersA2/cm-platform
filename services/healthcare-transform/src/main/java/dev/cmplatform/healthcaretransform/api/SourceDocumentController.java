package dev.cmplatform.healthcaretransform.api;

import dev.cmplatform.healthcaretransform.api.dto.SourceDocumentResponse;
import dev.cmplatform.healthcaretransform.api.dto.SubmissionResponse;
import dev.cmplatform.healthcaretransform.document.DocumentWorkflowService;
import dev.cmplatform.healthcaretransform.source.SourceDocumentCatalog;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/source-documents")
public class SourceDocumentController {
  private final SourceDocumentCatalog catalog;
  private final DocumentWorkflowService workflowService;

  public SourceDocumentController(SourceDocumentCatalog catalog, DocumentWorkflowService workflowService) {
    this.catalog = catalog;
    this.workflowService = workflowService;
  }

  @GetMapping
  public List<SourceDocumentResponse> list() {
    return catalog.list().stream().map(SourceDocumentResponse::from).toList();
  }

  @GetMapping("/{sourceId}")
  public SourceDocumentResponse get(@PathVariable String sourceId) {
    return SourceDocumentResponse.from(catalog.get(sourceId));
  }

  @PostMapping("/{sourceId}/process")
  @ResponseStatus(HttpStatus.CREATED)
  public SubmissionResponse process(@PathVariable String sourceId) {
    return SubmissionResponse.from(workflowService.submitSourceDocument(sourceId));
  }
}
