package dev.cmplatform.healthcaretransform.api;

import dev.cmplatform.healthcaretransform.api.dto.HealthResponse;
import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  @GetMapping("/health")
  public HealthResponse health() {
    return new HealthResponse("healthcare-transform", "UP", Instant.now());
  }

  @GetMapping("/ready")
  public HealthResponse ready() {
    return new HealthResponse("healthcare-transform", "READY", Instant.now());
  }
}
