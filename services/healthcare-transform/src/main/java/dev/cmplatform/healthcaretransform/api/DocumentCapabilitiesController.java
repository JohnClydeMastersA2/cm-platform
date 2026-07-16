package dev.cmplatform.healthcaretransform.api;

import dev.cmplatform.healthcaretransform.api.dto.CapabilitiesResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/documents")
public class DocumentCapabilitiesController {
  @GetMapping("/capabilities")
  public CapabilitiesResponse capabilities() {
    return new CapabilitiesResponse(
        "healthcare-transform",
        List.of("ASC_X12"),
        List.of("835"),
        List.of("parse", "archive-planned", "search-planned"));
  }
}
