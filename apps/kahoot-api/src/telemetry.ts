import { metrics, SpanStatusCode, trace } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NextFunction, Request, Response } from "express";

export function startTelemetry(
  endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
) {
  if (!endpoint) return undefined;
  const base = endpoint.replace(/\/$/, "");
  const sdk = new NodeSDK({
    serviceName: "kahoot-api",
    traceExporter: new OTLPTraceExporter({
      url: `${base}/v1/traces`,
      timeoutMillis: 2000,
    }),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${base}/v1/metrics`,
          timeoutMillis: 2000,
        }),
        exportIntervalMillis: 10000,
      }),
    ],
  });
  sdk.start();
  return sdk;
}

export function httpTelemetry(req: Request, res: Response, next: NextFunction) {
  const started = performance.now();
  const span = trace.getTracer("kahoot-api").startSpan(`HTTP ${req.method}`);
  res.once("finish", () => {
    const route = req.route?.path ?? "unmatched";
    const attributes = {
      "http.request.method": req.method,
      "http.route": String(route),
      "http.response.status_code": res.statusCode,
    };
    span.updateName(`${req.method} ${route}`);
    span.setAttributes(attributes);
    if (res.statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    const meter = metrics.getMeter("kahoot-api");
    meter.createCounter("http.server.requests").add(1, attributes);
    meter
      .createHistogram("http.server.duration", { unit: "s" })
      .record((performance.now() - started) / 1000, attributes);
  });
  next();
}

export function connectionsChanged(delta: number) {
  metrics
    .getMeter("kahoot-api")
    .createUpDownCounter("game.connections.active")
    .add(delta);
}
export function recordGameEvent(
  event: string,
  outcome: string,
  duration: number,
) {
  const attributes = { "game.event": event, "game.outcome": outcome },
    meter = metrics.getMeter("kahoot-api");
  meter.createCounter("game.events").add(1, attributes);
  meter
    .createHistogram("game.event.duration", { unit: "s" })
    .record(duration, attributes);
  const span = trace
    .getTracer("kahoot-api")
    .startSpan(event, { startTime: Date.now() - duration * 1000 });
  span.setAttributes(attributes);
  if (outcome === "error") span.setStatus({ code: SpanStatusCode.ERROR });
  span.end();
}
