import { metrics, SpanStatusCode, trace } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NextFunction, Request, Response } from "express";
import { GameMetrics } from "./domain/ports/game-metrics";

let activeSessions = 0;
function setActiveSessions(count: number) {
  activeSessions = Math.max(0, count);
  metrics
    .getMeter("kahoot-api")
    .createGauge("game.sessions.active", { unit: "{session}" })
    .record(activeSessions);
}
export const gameMetrics: GameMetrics = {
  sessionsRecovered: setActiveSessions,
  sessionStarted: () => setActiveSessions(activeSessions + 1),
  sessionFinished: () => setActiveSessions(activeSessions - 1),
  questionClosed: (seconds) =>
    metrics
      .getMeter("kahoot-api")
      .createHistogram("game.question.close.duration", { unit: "s" })
      .record(Math.max(0, seconds)),
};
const answerReasons = new Set([
  "already_answered",
  "late",
  "closed",
  "not_in_session",
  "invalid_state",
  "invalid_payload",
  "room_not_found",
  "internal_error",
]);
export function recordAnswer(
  outcome: "accepted" | "rejected",
  reason: string = "none",
) {
  const boundedReason =
    outcome === "accepted"
      ? "none"
      : answerReasons.has(reason)
        ? reason
        : "other";
  metrics
    .getMeter("kahoot-api")
    .createCounter("game.answers", { unit: "{answer}" })
    .add(1, { outcome, reason: boundedReason });
}
export function recordLiveRateLimited() {
  metrics
    .getMeter("kahoot-api")
    .createCounter("game.live.rate_limited", { unit: "{socket}" })
    .add(1);
}

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
