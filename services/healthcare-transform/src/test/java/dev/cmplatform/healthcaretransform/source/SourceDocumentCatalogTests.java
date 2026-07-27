package dev.cmplatform.healthcaretransform.source;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class SourceDocumentCatalogTests {
  @Test
  void catalogLoadsCurated835Documents() {
    var catalog = new SourceDocumentCatalog(new ObjectMapper());

    assertThat(catalog.list()).hasSize(9);
    assertThat(catalog.get("emedny-835-professional-with-payment").documentType())
        .isEqualTo("X12_835");
  }

  @Test
  void manifestHashesMatchClasspathResources() {
    var catalog = new SourceDocumentCatalog(new ObjectMapper());

    for (SourceDocument document : catalog.list()) {
      byte[] bytes = catalog.readBytes(document);
      assertThat(sha256(bytes)).isEqualTo(document.sha256());
    }
  }

  @Test
  void catalogFindsDocumentBySha256() {
    var catalog = new SourceDocumentCatalog(new ObjectMapper());
    SourceDocument document = catalog.get("healthcare-data-insight-835-denial");

    assertThat(catalog.findBySha256(document.sha256()))
        .contains(document);
  }

  private String sha256(byte[] data) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is unavailable.", exception);
    }
  }
}
