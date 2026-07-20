package dev.cmplatform.healthcaretransform.x12;

import static org.assertj.core.api.Assertions.assertThat;

import dev.cmplatform.healthcaretransform.api.dto.Parse835Request;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class X12835ParsingServiceTests {
  private final X12835ParsingService service = new X12835ParsingService();

  @Test
  void parsesMinimal835Fixture() throws Exception {
    String content = new String(
        getClass().getResourceAsStream("/x12/835/minimal-835.edi").readAllBytes(),
        StandardCharsets.UTF_8);

    var response = service.parse(new Parse835Request(content, "minimal-835.edi"));

    assertThat(response.status()).isEqualTo("parsed");
    assertThat(response.parserStatus()).isEqualTo("parsed");
    assertThat(response.warnings()).isEmpty();
    assertThat(response.parsed().envelope().interchangeControlNumber()).isEqualTo("000000905");
    assertThat(response.parsed().envelope().groupControlNumber()).isEqualTo("1");
    assertThat(response.parsed().envelope().transactionControlNumber()).isEqualTo("0001");
    assertThat(response.parsed().envelope().senderId()).isEqualTo("SENDERID");
    assertThat(response.parsed().envelope().receiverId()).isEqualTo("RECEIVERID");
    assertThat(response.parsed().envelope().functionalIdentifierCode()).isEqualTo("HP");
    assertThat(response.parsed().envelope().implementationVersion()).isEqualTo("005010X221A1");
    assertThat(response.parsed().payment().paymentAmount()).isEqualTo("1500.00");
    assertThat(response.parsed().payment().paymentMethod()).isEqualTo("ACH");
    assertThat(response.parsed().payment().paymentDate()).isEqualTo("20260720");
    assertThat(response.parsed().payment().traceNumber()).isEqualTo("12345ABC");
    assertThat(response.parsed().payer().name()).isEqualTo("ACME HEALTH PLAN");
    assertThat(response.parsed().payer().identificationCode()).isEqualTo("12345");
    assertThat(response.parsed().payee().name()).isEqualTo("CM PLATFORM CLINIC");
    assertThat(response.parsed().payee().identificationCode()).isEqualTo("1234567893");
  }
}
