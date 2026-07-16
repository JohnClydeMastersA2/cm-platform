package dev.cmplatform.healthcaretransform.api;

import static org.assertj.core.api.Assertions.assertThat;

import dev.cmplatform.healthcaretransform.api.dto.Parse835Request;
import org.junit.jupiter.api.Test;

class X12835ControllerTests {
  @Test
  void parseReturnsPlaceholderResponse() {
    var request = new Parse835Request(
        "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *260715*1200*^*00501*000000001*0*T*:~",
        "sample-835.edi");
    var response = new X12835Controller().parse(request);

    assertThat(response.documentId()).isNotBlank();
    assertThat(response.family()).isEqualTo("ASC_X12");
    assertThat(response.documentType()).isEqualTo("835");
    assertThat(response.status()).isEqualTo("received");
    assertThat(response.parserStatus()).isEqualTo("not_implemented");
    assertThat(response.sourceFilename()).isEqualTo("sample-835.edi");
    assertThat(response.receivedAt()).isNotNull();
  }
}
