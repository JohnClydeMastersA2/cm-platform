package dev.cmplatform.healthcaretransform.source;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
public class SourceDocumentCatalog {
  private static final String MANIFEST_PATH = "source-documents/source-documents.json";

  private final List<SourceDocument> documents;

  public SourceDocumentCatalog(ObjectMapper objectMapper) {
    try (var input = new ClassPathResource(MANIFEST_PATH).getInputStream()) {
      SourceDocumentManifest manifest = objectMapper.readValue(input, SourceDocumentManifest.class);
      this.documents = manifest.documents().stream()
          .sorted(Comparator.comparing(SourceDocument::sourceId))
          .toList();
    } catch (IOException exception) {
      throw new UncheckedIOException("Unable to load source document manifest.", exception);
    }
  }

  public List<SourceDocument> list() {
    return documents;
  }

  public SourceDocument get(String sourceId) {
    return findBySourceId(sourceId).orElseThrow(() -> new SourceDocumentNotFoundException(sourceId));
  }

  public Optional<SourceDocument> findBySourceId(String sourceId) {
    return documents.stream()
        .filter(document -> document.sourceId().equals(sourceId))
        .findFirst();
  }

  public Optional<SourceDocument> findBySha256(String sha256) {
    String normalized = sha256.toLowerCase(Locale.ROOT);
    return documents.stream()
        .filter(document -> document.sha256().equals(normalized))
        .findFirst();
  }

  public byte[] readBytes(SourceDocument document) {
    try (var input = new ClassPathResource(document.resourcePath()).getInputStream()) {
      return input.readAllBytes();
    } catch (IOException exception) {
      throw new UncheckedIOException("Unable to read source document: " + document.sourceId(), exception);
    }
  }
}
