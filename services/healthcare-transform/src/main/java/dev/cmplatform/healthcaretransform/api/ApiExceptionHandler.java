package dev.cmplatform.healthcaretransform.api;

import dev.cmplatform.healthcaretransform.document.DocumentNotFoundException;
import dev.cmplatform.healthcaretransform.document.InvalidDocumentException;
import dev.cmplatform.healthcaretransform.document.UnapprovedSourceDocumentException;
import dev.cmplatform.healthcaretransform.source.SourceDocumentNotFoundException;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler({
      InvalidDocumentException.class,
      MissingServletRequestPartException.class,
      MaxUploadSizeExceededException.class
  })
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ApiError badRequest(Exception exception) {
    String message = exception instanceof MaxUploadSizeExceededException
        ? "File exceeds the 10 MiB upload limit."
        : exception.getMessage();
    return new ApiError("INVALID_DOCUMENT", message, Instant.now(), Map.of());
  }

  @ExceptionHandler(UnapprovedSourceDocumentException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  public ApiError unapprovedSourceDocument(UnapprovedSourceDocumentException exception) {
    var details = exception.details();
    return new ApiError(
        "UNAPPROVED_SOURCE_DOCUMENT",
        exception.getMessage(),
        Instant.now(),
        Map.of(
            "receivedAt", details.receivedAt(),
            "filename", details.filename(),
            "contentType", details.contentType(),
            "size", details.size(),
            "sha256", details.sha256(),
            "documentType", details.documentType()));
  }

  @ExceptionHandler(DocumentNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public ApiError notFound(DocumentNotFoundException exception) {
    return new ApiError("DOCUMENT_NOT_FOUND", exception.getMessage(), Instant.now(), Map.of());
  }

  @ExceptionHandler(SourceDocumentNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public ApiError sourceDocumentNotFound(SourceDocumentNotFoundException exception) {
    return new ApiError("SOURCE_DOCUMENT_NOT_FOUND", exception.getMessage(), Instant.now(), Map.of());
  }

  public record ApiError(String code, String message, Instant timestamp, Map<String, Object> details) {}
}
