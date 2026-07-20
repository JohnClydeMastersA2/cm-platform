package dev.cmplatform.healthcaretransform.api;

import dev.cmplatform.healthcaretransform.api.dto.Parse835Request;
import dev.cmplatform.healthcaretransform.api.dto.Parse835Response;
import dev.cmplatform.healthcaretransform.x12.X12835ParsingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/x12/835")
public class X12835Controller {
  private final X12835ParsingService parsingService;

  public X12835Controller(X12835ParsingService parsingService) {
    this.parsingService = parsingService;
  }

  @PostMapping("/parse")
  public Parse835Response parse(@Valid @RequestBody Parse835Request request) {
    return parsingService.parse(request);
  }
}
