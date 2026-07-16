package dev.cmplatform.healthcaretransform.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class HealthControllerTests {
  @Test
  void healthReturnsUp() {
    var response = new HealthController().health();

    assertThat(response.service()).isEqualTo("healthcare-transform");
    assertThat(response.status()).isEqualTo("UP");
    assertThat(response.checkedAt()).isNotNull();
  }
}
