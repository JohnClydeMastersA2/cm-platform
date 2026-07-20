package dev.cmplatform.healthcaretransform.api.dto;

import java.time.Instant;
import java.util.List;

public record Parse835Response(
    String documentId,
    String family,
    String documentType,
    String status,
    String parserStatus,
    int characterCount,
    String sourceFilename,
    Instant receivedAt,
    Parsed835Document parsed,
    List<String> warnings) {
  public record Parsed835Document(
      X12Envelope envelope,
      PaymentSummary payment,
      Party payer,
      Party payee) {}

  public record X12Envelope(
      String interchangeControlNumber,
      String groupControlNumber,
      String transactionControlNumber,
      String senderId,
      String receiverId,
      String functionalIdentifierCode,
      String implementationVersion) {}

  public record PaymentSummary(
      String transactionHandlingCode,
      String paymentMethod,
      String paymentAmount,
      String paymentDate,
      String traceTypeCode,
      String traceNumber,
      String originatingCompanyId,
      String originatingCompanySupplementalCode) {}

  public record Party(
      String roleCode,
      String name,
      String identificationCodeQualifier,
      String identificationCode) {}
}
