package dev.cmplatform.healthcaretransform.api.dto;

import jakarta.validation.constraints.NotBlank;

public record Parse835Request(
    @NotBlank(message = "content is required") String content,
    String sourceFilename) {}
