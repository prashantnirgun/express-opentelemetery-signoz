// ============================================================================
// OpenTelemetry Instrumentation Setup
// This file initializes distributed tracing and logging for the application
// It MUST be imported first in index.js before any other code runs
// ============================================================================

//import "./startup/load_env.js";

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { logs } from "@opentelemetry/api-logs";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { MongoDBInstrumentation } from "@opentelemetry/instrumentation-mongodb";
import { MongooseInstrumentation } from "@opentelemetry/instrumentation-mongoose";

// ============================================================================
// 1. EXPORTERS: Send data to SigNoz (or any OTLP-compatible backend)
// ============================================================================

// Trace Exporter: Sends request traces to SigNoz backend
// A trace is a full journey of a request through your application
// Example: User request → Express → Database → Response
const traceExporter = new OTLPTraceExporter({
  url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
});

// Log Exporter: Sends application logs to SigNoz backend
// This includes console.log(), logger.info(), logger.error(), etc.
const logExporter = new OTLPLogExporter({
  url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
});

// ============================================================================
// 2. RESOURCE: Define your service metadata
// Resource tells SigNoz which service/application is sending the telemetry
// Attributes help you filter and group data in SigNoz dashboards
// ============================================================================

const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME, // e.g., "my-app-local"
  [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION, // e.g., "1.0.0"
  // You can add more attributes like environment, region, etc.
});

// ============================================================================
// 3. LOGGER PROVIDER: Creates and manages logs
// BatchLogRecordProcessor batches logs before sending them (more efficient)
// ============================================================================

const loggerProvider = new LoggerProvider({
  resource, // Attach service metadata to all logs
});

// Add processor that batches logs and sends them to SigNoz
loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));

// Register this logger provider globally so it can be used anywhere
logs.setGlobalLoggerProvider(loggerProvider);

// ============================================================================
// 4. NODE SDK: The main OpenTelemetry orchestrator
// This SDK automatically instruments your Node.js application:
// - Captures HTTP requests/responses
// - Records database queries
// - Tracks async operations
// - Correlates logs with traces (trace_id, span_id)
// ============================================================================

const sdk = new NodeSDK({
  resource, // Attach service metadata to all traces
  traceExporter, // Send traces to SigNoz

  // Auto-instrumentations: Automatically hooks into popular libraries
  instrumentations: [
    getNodeAutoInstrumentations({
      // Automatically instruments: Express, HTTP, database drivers, etc.
      "@opentelemetry/instrumentation-fs": {
        enabled: false, // Disable file system instrumentation to reduce noise
      },
      "@opentelemetry/instrumentation-aws-sdk": {
        enabled: false, // Disable AWS SDK to avoid version conflicts
      },
      "@opentelemetry/instrumentation-express": {
        enabled: true, // Capture Express middleware and route-level traces
      },
      "@opentelemetry/instrumentation-mongodb": {
        enabled: true,
        enhancedDatabaseReporting: true, // Enables actual DB query visibility
      },
      "@opentelemetry/instrumentation-mongoose": {
        enabled: true,
        enhancedDatabaseReporting: true, // Enables Mongoose query visibility
      },
    }),

    // Winston instrumentation: Correlates logs with distributed traces
    // This adds trace_id and span_id to every log for better tracing
    new WinstonInstrumentation({
      logHook: (span, record) => {
        // Add service name to each log record for better context
        record["resource.service.name"] = process.env.OTEL_SERVICE_NAME;
      },
    }),

    // Explicit MongoDB instrumentation for better control
    new MongoDBInstrumentation({
      enhancedDatabaseReporting: true,
    }),

    // Explicit Mongoose instrumentation for Mongoose-specific operations
    new MongooseInstrumentation({
      enhancedDatabaseReporting: true,
    }),
  ],
});

// ============================================================================
// 5. START SDK: Initialize OpenTelemetry and start capturing telemetry
// ============================================================================

try {
  sdk.start();
  console.log("OpenTelemetry instrumentation initialized successfully");
} catch (error) {
  console.error("Error initializing OpenTelemetry:", error);
  process.exit(1); // Exit if instrumentation fails
}

// ============================================================================
// 6. GRACEFUL SHUTDOWN: Clean up when app terminates
// This ensures all buffered telemetry is sent before exit
// ============================================================================

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("OpenTelemetry SDK shut down successfully"))
    .catch((error) =>
      console.error("Error shutting down OpenTelemetry:", error),
    )
    .finally(() => process.exit(0));
});

export { loggerProvider };
