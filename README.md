# OpenTelemetry & SigNoz Integration Guide

A complete beginner-friendly guide to implementing distributed tracing and logging in Node.js/Express applications using OpenTelemetry and SigNoz.

---

## Table of Contents

1. [What is OpenTelemetry?](#what-is-opentelemetry)
2. [What is SigNoz?](#what-is-signoz)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Project Structure](#project-structure)
6. [Key Concepts](#key-concepts)
7. [How It Works](#how-it-works)
8. [Troubleshooting](#troubleshooting)
9. [Next Steps](#next-steps)

---

## What is OpenTelemetry?

**OpenTelemetry (OTel)** is an open standard for collecting telemetry data from your applications. It helps you understand what's happening inside your code without invasive logging everywhere.

### Key Benefits:

- **Distributed Tracing**: Track requests across multiple services
- **Automatic Instrumentation**: Hooks into popular libraries (Express, HTTP, databases)
- **Log Correlation**: Links logs with traces using trace IDs
- **Vendor-Neutral**: Works with any observability backend (SigNoz, Datadog, New Relic, etc.)

### What Does It Capture?

- **Traces**: Full journey of a request (HTTP request → processing → response)
- **Logs**: Application logs with context (info, debug, error, warn)
- **Metrics**: Performance data (request duration, error rates, etc.)

---

## What is SigNoz?

**SigNoz** is an open-source observability platform that receives and visualizes telemetry data.

### Why SigNoz?

- **Open Source**: Self-hosted, no vendor lock-in
- **Full Stack Monitoring**: Traces, logs, and metrics in one place
- **Real-time Dashboards**: Visualize your application's performance
- **Cost-Effective**: No per-event pricing

### What Can You Do?

- View distributed traces in real-time
- Search logs across all your services
- Create dashboards and alerts
- Identify performance bottlenecks

---

## Prerequisites

### Required Knowledge

- Basic Node.js and Express understanding
- Familiarity with environment variables
- Understanding of HTTP requests/responses

### System Requirements

- **Node.js**: v16+ (we use ES modules)
- **npm**: v8+ or **pnpm** v10+
- **SigNoz Instance**: Running locally or on a server
  - Local: `http://localhost:4318`

---

## Step-by-Step Setup

### Step 1: Initialize Node.js Project

```bash
mkdir my-app
cd my-app
npm init -y
```

### Step 2: Install Dependencies

OpenTelemetry packages:

```bash
npm install \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-logs-otlp-http \
  @opentelemetry/sdk-logs \
  @opentelemetry/api-logs \
  @opentelemetry/instrumentation-winston \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

Application dependencies:

```bash
npm install express winston dotenv
```

### Step 3: Update package.json

Add ES module support and a simple start script:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "@opentelemetry/sdk-node": "^0.56.0",
    "@opentelemetry/auto-instrumentations-node": "^0.65.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.56.0",
    "@opentelemetry/exporter-logs-otlp-http": "^0.56.0",
    "@opentelemetry/sdk-logs": "^0.56.0",
    "@opentelemetry/api-logs": "^0.56.0",
    "@opentelemetry/instrumentation-winston": "^0.51.0",
    "@opentelemetry/resources": "^1.30.1",
    "@opentelemetry/semantic-conventions": "^1.38.0",
    "express": "^5.0.0",
    "winston": "^3.18.3",
    "dotenv": "^17.2.3"
  }
}
```

### Step 4: Create .env File

Create a `.env` file in your project root:

```env
# Service Configuration
OTEL_SERVICE_NAME=my-app-local
OTEL_SERVICE_VERSION=1.0.0

# SigNoz Backend Configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs

# Application Configuration
LOG_LEVEL=info
NODE_ENV=development
PORT=9000
```

**Important**: For local SigNoz, change endpoints to:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs
```

### Step 5: Create instrumentation.js

This file initializes OpenTelemetry. **It MUST be imported first in your main file.**

```javascript
// ============================================================================
// OpenTelemetry Instrumentation Setup
// This file initializes distributed tracing and logging for the application
// It MUST be imported first in index.js before any other code runs
// ============================================================================

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
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// ============================================================================
// 1. EXPORTERS: Send data to SigNoz
// ============================================================================

// Trace Exporter: Sends request traces to SigNoz
// A trace is a complete request journey through your app
const traceExporter = new OTLPTraceExporter({
  url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
});

// Log Exporter: Sends application logs to SigNoz
const logExporter = new OTLPLogExporter({
  url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
});

// ============================================================================
// 2. RESOURCE: Define your service metadata
// ============================================================================

const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
  [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION,
});

// ============================================================================
// 3. LOGGER PROVIDER: Creates and manages logs
// ============================================================================

const loggerProvider = new LoggerProvider({ resource });
loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));
logs.setGlobalLoggerProvider(loggerProvider);

// ============================================================================
// 4. NODE SDK: The main OpenTelemetry orchestrator
// ============================================================================

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {
        enabled: false, // Disable file system instrumentation
      },
    }),
    new WinstonInstrumentation({
      logHook: (span, record) => {
        record["resource.service.name"] = process.env.OTEL_SERVICE_NAME;
      },
    }),
  ],
});

// ============================================================================
// 5. START SDK
// ============================================================================

try {
  sdk.start();
  console.log("✓ OpenTelemetry initialized");
} catch (error) {
  console.error("✗ Error initializing OpenTelemetry:", error);
  process.exit(1);
}

// ============================================================================
// 6. GRACEFUL SHUTDOWN
// ============================================================================

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("✓ OpenTelemetry shut down"))
    .catch((error) => console.error("✗ Shutdown error:", error))
    .finally(() => process.exit(0));
});

export { loggerProvider };
```

### Step 6: Create logger.js

This configures Winston logging with OpenTelemetry support:

```javascript
import winston from "winston";
import { context, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { SeverityNumber } from "@opentelemetry/api-logs";

// ============================================================================
// TRACE CONTEXT: Automatically add trace_id and span_id to logs
// ============================================================================

const addTraceContext = winston.format((info) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const spanContext = span.spanContext();
    info.trace_id = spanContext.traceId;
    info.span_id = spanContext.spanId;
  }
  return info;
});

// ============================================================================
// CUSTOM OTLP TRANSPORT: Send logs to SigNoz
// ============================================================================

class OTLPTransport extends winston.Transport {
  log(info, callback) {
    setImmediate(() => {
      const logger = logs.getLogger("winston-logger");

      const severityMap = {
        error: SeverityNumber.ERROR,
        warn: SeverityNumber.WARN,
        info: SeverityNumber.INFO,
        debug: SeverityNumber.DEBUG,
      };

      logger.emit({
        body: info.message,
        severityNumber: severityMap[info.level] || SeverityNumber.INFO,
        severityText: info.level.toUpperCase(),
        attributes: { ...info, message: info.message },
      });

      if (callback) callback();
    });
  }
}

const isProd = process.env.NODE_ENV === "production";

// ============================================================================
// WINSTON LOGGER
// ============================================================================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL,
  format: winston.format.combine(
    addTraceContext(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: process.env.OTEL_SERVICE_NAME },
  transports: [
    new OTLPTransport(), // Send to SigNoz
    new winston.transports.Console({
      format: isProd
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              let msg = `${timestamp} [${level}]: ${message}`;
              if (Object.keys(meta).length > 0) {
                msg += ` ${JSON.stringify(meta)}`;
              }
              return msg;
            }),
          ),
    }),
  ],
});

logger.stream = { write: (msg) => logger.info(msg.trim()) };

export default logger;
```

### Step 7: Create index.js

Your Express application:

```javascript
// CRITICAL: Import instrumentation FIRST before any other code
import "./instrumentation.js";

import express from "express";
import logger from "./logger.js";

const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

app.get("/", (req, res) => {
  logger.info("Root endpoint accessed");
  res.json({ msg: "Hello World" });
});

app.get("/api/health", (req, res) => {
  logger.debug("Health check");
  res.json({ status: "healthy" });
});

app.get("/api/error", (req, res) => {
  logger.error("Simulated error");
  res.status(500).json({ error: "Something went wrong" });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
  });
  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Server Error" : err.message,
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, {
    service: process.env.OTEL_SERVICE_NAME,
    version: process.env.OTEL_SERVICE_VERSION,
    environment: process.env.NODE_ENV,
  });
});
```

---

## Project Structure

```
my-app/
├── .env                    # Environment variables
├── .gitignore             # Add .env and node_modules
├── package.json
├── package-lock.json
├── README.md
├── instrumentation.js     # OpenTelemetry setup
├── logger.js              # Winston logger with OTLP
└── index.js               # Express app
```

---

## Key Concepts

### 1. **Traces**

A trace is the complete journey of one request:

```
User Request
    ↓
Express Middleware
    ↓
Route Handler
    ↓
Logger.info() call
    ↓
HTTP Response
    ↓ (All linked with same trace_id in SigNoz)
```

### 2. **Spans**

A span is one operation within a trace. OpenTelemetry automatically creates spans for:

- HTTP requests
- Express route handlers
- Database queries
- Async operations

### 3. **trace_id and span_id**

- **trace_id**: Unique ID for the entire request journey
- **span_id**: Unique ID for one operation within the trace
- These link logs to traces in SigNoz

### 4. **Severity Levels**

Log levels used in SigNoz:

- **DEBUG**: Detailed debugging information
- **INFO**: General informational messages
- **WARN**: Warning messages (recoverable issues)
- **ERROR**: Error messages (problems that need attention)

### 5. **Resource**

Metadata that identifies your service:

- **Service Name**: Identifies your app in SigNoz
- **Service Version**: Tracks different versions
- **Environment**: dev, staging, production

---

## How It Works

### Data Flow Diagram

```
Your Application
    ↓
logger.info("User login")  ← Automatically captures trace_id, span_id
logger.error("Database error")
    ↓
OpenTelemetry SDK
    ↓ (Batches logs and traces)
OTLP Exporter
    ↓ (OTLP Protocol)
SigNoz Backend (http://localhost:4318)
    ↓
SigNoz Dashboard
    ↓
You can search, filter, and analyze
```

### What Happens When You Make a Request

1. **Request arrives** → Express middleware logs it
2. **Route processes** → OpenTelemetry creates a span
3. **Your code logs** → Logger adds trace_id, span_id automatically
4. **Response sent** → Span ends
5. **Batch export** → All logs/traces sent to SigNoz (every 5 seconds)
6. **Dashboard update** → You see the request in SigNoz UI

---

## Running the Application

### Step 1: Start Your App

```bash
npm start
```

Expected output:

```
✓ OpenTelemetry initialized
Server started on port 9000
```

### Step 2: Make Test Requests

```bash
# Health check
curl http://localhost:9000/api/health

# Root endpoint
curl http://localhost:9000/

# Error endpoint
curl http://localhost:9000/api/error

# POST request
curl -X POST http://localhost:9000/api/data \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'
```

### Step 3: View in SigNoz

1. Go to `http://localhost:4318/services` (or your SigNoz URL)
2. Click on `my-app-local` service
3. You'll see:
   - Request traces in real-time
   - Logs associated with each trace
   - Performance metrics
   - Error tracking

---

## Verification Checklist

- [ ] `instrumentation.js` is imported FIRST in `index.js`
- [ ] `.env` file has correct SigNoz endpoint
- [ ] `OTEL_SERVICE_NAME` matches what you see in SigNoz
- [ ] No error messages on startup
- [ ] SigNoz shows incoming requests and logs
- [ ] Logs have `trace_id` field in SigNoz
- [ ] Errors appear in SigNoz Error tab

---

## Troubleshooting

### Problem: "No logs showing up in SigNoz"

**Check 1: Is SigNoz running?**

```bash
curl http://localhost:4318/healthz
```

Should return HTTP 200.

**Check 2: Can your app reach SigNoz?**

```bash
curl -v http://localhost:4318/v1/logs
```

Should connect without timeout.

**Check 3: Is `.env` loaded?**

```javascript
// In instrumentation.js, add:
console.log("OTEL_SERVICE_NAME:", process.env.OTEL_SERVICE_NAME);
```

**Check 4: Wrong endpoint?**

- Local SigNoz: `http://localhost:4318`
- Remote SigNoz: `http://IP:4318`
- AWS Security Group must allow port 4318

### Problem: "Logs not linked to traces"

Make sure:

1. `addTraceContext()` is first in format chain in `logger.js`
2. You're using the logger exported from `logger.js`
3. Logs are being created inside request handlers (within trace context)

### Problem: "TypeError: logs.getLogger is not a function"

Make sure `logs` is imported from `@opentelemetry/api-logs`, not `@opentelemetry/api`:

```javascript
// ✓ Correct
import { logs } from "@opentelemetry/api-logs";

// ✗ Wrong
import { logs } from "@opentelemetry/api";
```

### Problem: "Cannot find module './instrumentation.js'"

1. Check spelling of filename
2. Ensure `.js` extension in import (required for ES modules)
3. File must be in same directory as `index.js`

---

## Environment Variables Reference

| Variable                           | Purpose                 | Example                         |
| ---------------------------------- | ----------------------- | ------------------------------- |
| `OTEL_SERVICE_NAME`                | Your app name in SigNoz | `my-app-local`                  |
| `OTEL_SERVICE_VERSION`             | Version tracking        | `1.0.0`                         |
| `OTEL_EXPORTER_OTLP_ENDPOINT`      | SigNoz server (traces)  | `http://localhost:4318`         |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | SigNoz server (logs)    | `http://localhost:4318/v1/logs` |
| `LOG_LEVEL`                        | Log verbosity           | `info` or `debug`               |
| `NODE_ENV`                         | Environment type        | `development` or `production`   |
| `PORT`                             | Express server port     | `9000`                          |

---

## Next Steps

### 1. **Add Database Instrumentation**

If using MongoDB, PostgreSQL, etc., OpenTelemetry has instrumentation packages:

```bash
npm install @opentelemetry/instrumentation-mongodb
```

### 2. **Add Custom Metrics**

Track business metrics like "users logged in":

```javascript
import { metrics } from "@opentelemetry/api";
const meter = metrics.getMeter("app-meter");
const counter = meter.createCounter("users_logged_in");
counter.add(1);
```

### 3. **Add Alerts in SigNoz**

Set up alerts for:

- Error rate > 1%
- Response time > 500ms
- Specific error messages

### 4. **Use in Production**

For production:

1. Change `LOG_LEVEL=info` (reduces verbosity)
2. Use environment-specific `.env` files
3. Set up SigNoz retention policies
4. Configure sampling to reduce data volume

### 5. **Multi-Service Setup**

If you have multiple services:

1. Use same `OTEL_EXPORTER_OTLP_ENDPOINT`
2. Use different `OTEL_SERVICE_NAME` for each
3. Traces will automatically correlate across services

---

## Common Use Cases

### 1. **Debug a Slow Request**

In SigNoz, find the request, click it:

- See exact timeline of operations
- Identify which operation is slow
- Check logs at that exact time

### 2. **Trace an Error**

In SigNoz Error tab:

- See all requests that errored
- Click to see full trace
- Check logs before error occurred

### 3. **Monitor API Performance**

Create SigNoz dashboard showing:

- Average response time by endpoint
- Error rate by endpoint
- Request rate by endpoint

### 4. **Track User Journey**

Use trace context propagation:

- Add user_id to log metadata
- Filter logs by user_id in SigNoz
- See complete user journey

---

## Resources

- **OpenTelemetry Docs**: https://opentelemetry.io/docs/
- **SigNoz Docs**: https://signoz.io/docs/
- **OTLP Protocol**: https://opentelemetry.io/docs/reference/protocol/
- **Winston Logger**: https://github.com/winstonjs/winston

---

## Support

If you encounter issues:

1. Check the Troubleshooting section above
2. Check SigNoz logs: `docker logs signoz` (if using Docker)
3. Verify connectivity: `curl http://YOUR_SIGNOZ_ENDPOINT:4318/healthz`
4. Enable debug logging: Set `LOG_LEVEL=debug` in `.env`

---

**Happy Tracing! 🚀**
