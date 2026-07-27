package dev.cmplatform.healthcaretransform.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import dev.cmplatform.healthcaretransform.document.Artifact;
import dev.cmplatform.healthcaretransform.document.ArtifactKind;
import dev.cmplatform.healthcaretransform.document.DocumentWorkflowService;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class DocumentControllerTests {
  @Test
  void rawArtifactResponseReturnsStoredBytesAndContentType() {
    DocumentWorkflowService workflowService = mock(DocumentWorkflowService.class);
    byte[] data = "ISA*00*~".getBytes(StandardCharsets.UTF_8);
    when(workflowService.getRawArtifact("submission-1"))
        .thenReturn(artifact(ArtifactKind.ORIGINAL, "sample.edi", "text/plain", data));

    var response = new DocumentController(workflowService).getRaw("submission-1");

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.TEXT_PLAIN);
    assertThat(response.getBody()).isEqualTo(data);
    assertThat(response.getHeaders().getContentDisposition().getFilename()).isEqualTo("sample.edi");
  }

  @Test
  void jsonArtifactResponseReturnsStoredBytesAndContentType() {
    DocumentWorkflowService workflowService = mock(DocumentWorkflowService.class);
    byte[] data = "{\"payment\":{}}".getBytes(StandardCharsets.UTF_8);
    when(workflowService.getTransformedArtifact("submission-1"))
        .thenReturn(artifact(ArtifactKind.TRANSFORMED, "sample.edi.json", "application/json", data));

    var response = new DocumentController(workflowService).getJson("submission-1");

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
    assertThat(response.getBody()).isEqualTo(data);
    assertThat(response.getHeaders().getContentDisposition().getFilename()).isEqualTo("sample.edi.json");
  }

  private Artifact artifact(ArtifactKind kind, String filename, String contentType, byte[] data) {
    return new Artifact(
        "artifact-1",
        "submission-1",
        kind,
        filename,
        contentType,
        data.length,
        "hash",
        data,
        Instant.now());
  }
}
