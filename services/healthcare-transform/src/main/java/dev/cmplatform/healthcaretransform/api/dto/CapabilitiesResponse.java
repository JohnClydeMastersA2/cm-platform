package dev.cmplatform.healthcaretransform.api.dto;

import java.util.List;

public record CapabilitiesResponse(
    String service,
    List<String> supportedFamilies,
    List<String> supportedDocumentTypes,
    List<String> capabilities) {}
