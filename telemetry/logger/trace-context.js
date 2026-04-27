// ============================================================================
// Trace Context Enrichment
// Automatically adds trace_id and span_id to every log
// This correlates logs with distributed traces for better debugging
// ============================================================================

import { context, trace } from "@opentelemetry/api";
import winston from "winston";

export const addTraceContext = winston.format((info) => {
  // Get the current active span from the distributed trace context
  const span = trace.getSpan(context.active());

  if (span) {
    // Extract trace IDs from the span
    const spanContext = span.spanContext();
    // Add trace IDs to the log record
    // These IDs link the log back to the distributed trace in SigNoz
    info.trace_id = spanContext.traceId;
    info.span_id = spanContext.spanId;
  }
  return info;
});
