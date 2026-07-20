package dev.cmplatform.healthcaretransform.x12;

import dev.cmplatform.healthcaretransform.api.dto.Parse835Request;
import dev.cmplatform.healthcaretransform.api.dto.Parse835Response;
import dev.cmplatform.healthcaretransform.api.dto.Parse835Response.Parsed835Document;
import dev.cmplatform.healthcaretransform.api.dto.Parse835Response.Party;
import dev.cmplatform.healthcaretransform.api.dto.Parse835Response.PaymentSummary;
import dev.cmplatform.healthcaretransform.api.dto.Parse835Response.X12Envelope;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class X12835ParsingService {
  public Parse835Response parse(Parse835Request request) {
    String content = request.content();
    X12Delimiters delimiters = X12Delimiters.from(content);
    List<X12Segment> segments = X12Segment.parse(content, delimiters);
    List<String> warnings = new ArrayList<>();

    X12Envelope envelope = parseEnvelope(segments, warnings);
    PaymentSummary payment = parsePayment(segments, warnings);
    Party payer = parseParty(segments, "PR").orElseGet(() -> {
      warnings.add("Missing payer N1 segment with entity identifier code PR.");
      return null;
    });
    Party payee = parseParty(segments, "PE").orElseGet(() -> {
      warnings.add("Missing payee N1 segment with entity identifier code PE.");
      return null;
    });

    return new Parse835Response(
        UUID.randomUUID().toString(),
        "ASC_X12",
        "835",
        warnings.isEmpty() ? "parsed" : "parsed_with_warnings",
        warnings.isEmpty() ? "parsed" : "parsed_with_warnings",
        content.length(),
        request.sourceFilename(),
        Instant.now(),
        new Parsed835Document(envelope, payment, payer, payee),
        List.copyOf(warnings));
  }

  private X12Envelope parseEnvelope(List<X12Segment> segments, List<String> warnings) {
    X12Segment isa = first(segments, "ISA").orElse(null);
    X12Segment gs = first(segments, "GS").orElse(null);
    X12Segment st = first(segments, "ST").orElse(null);

    if (isa == null) {
      warnings.add("Missing ISA interchange control segment.");
    }
    if (gs == null) {
      warnings.add("Missing GS functional group segment.");
    }
    if (st == null) {
      warnings.add("Missing ST transaction set header segment.");
    }

    return new X12Envelope(
        value(isa, 13),
        value(gs, 6),
        value(st, 2),
        trim(value(isa, 6)),
        trim(value(isa, 8)),
        value(gs, 1),
        value(gs, 8));
  }

  private PaymentSummary parsePayment(List<X12Segment> segments, List<String> warnings) {
    X12Segment bpr = first(segments, "BPR").orElse(null);
    X12Segment trn = first(segments, "TRN").orElse(null);

    if (bpr == null) {
      warnings.add("Missing BPR payment information segment.");
    }
    if (trn == null) {
      warnings.add("Missing TRN reassociation trace segment.");
    }

    return new PaymentSummary(
        value(bpr, 1),
        value(bpr, 4),
        value(bpr, 2),
        value(bpr, 16),
        value(trn, 1),
        value(trn, 2),
        value(trn, 3),
        value(trn, 4));
  }

  private Optional<Party> parseParty(List<X12Segment> segments, String roleCode) {
    return segments.stream()
        .filter(segment -> segment.tag().equals("N1"))
        .filter(segment -> roleCode.equals(segment.value(1)))
        .findFirst()
        .map(segment -> new Party(
            segment.value(1),
            segment.value(2),
            segment.value(3),
            segment.value(4)));
  }

  private Optional<X12Segment> first(List<X12Segment> segments, String tag) {
    return segments.stream().filter(segment -> segment.tag().equals(tag)).findFirst();
  }

  private String value(X12Segment segment, int elementPosition) {
    return segment == null ? null : segment.value(elementPosition);
  }

  private String trim(String value) {
    return value == null ? null : value.trim();
  }

  private record X12Delimiters(char elementSeparator, char segmentTerminator) {
    static X12Delimiters from(String content) {
      char elementSeparator = content.length() > 3 ? content.charAt(3) : '*';
      char segmentTerminator = '~';
      if (content.startsWith("ISA") && content.length() > 105) {
        segmentTerminator = content.charAt(105);
      }
      return new X12Delimiters(elementSeparator, segmentTerminator);
    }
  }

  private record X12Segment(String tag, List<String> elements) {
    static List<X12Segment> parse(String content, X12Delimiters delimiters) {
      return Arrays.stream(content.split(java.util.regex.Pattern.quote(String.valueOf(delimiters.segmentTerminator()))))
          .map(String::trim)
          .filter(segment -> !segment.isBlank())
          .map(segment -> {
            String[] parts = segment.split(java.util.regex.Pattern.quote(String.valueOf(delimiters.elementSeparator())), -1);
            return new X12Segment(parts[0], Arrays.asList(parts));
          })
          .toList();
    }

    String value(int elementPosition) {
      return elementPosition < elements.size() ? emptyToNull(elements.get(elementPosition)) : null;
    }

    private String emptyToNull(String value) {
      return value == null || value.isBlank() ? null : value;
    }
  }
}
