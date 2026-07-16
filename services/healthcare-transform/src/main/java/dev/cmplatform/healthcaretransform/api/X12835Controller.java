package dev.cmplatform.healthcaretransform.api;

import dev.cmplatform.healthcaretransform.api.dto.Parse835Request;
import dev.cmplatform.healthcaretransform.api.dto.Parse835Response;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/x12/835")
public class X12835Controller {
  @PostMapping("/parse")
  public Parse835Response parse(@Valid @RequestBody Parse835Request request) {
    return new Parse835Response(
        UUID.randomUUID().toString(),
        "ASC_X12",
        "835",
        "received",
        "not_implemented",
        request.content().length(),
        request.sourceFilename(),
        Instant.now());
  }
}
