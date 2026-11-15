import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { Request, Response } from "express";
import {
  startTelemetry,
  httpTelemetry,
  recordGameEvent,
  connectionsChanged,
  gameMetrics,
  recordAnswer,
  recordLiveRateLimited,
} from "../src/telemetry";
test("exporta trazas y métricas HTTP y del juego sin datos personales", async () => {
  const received: { url: string; body: string }[] = [];
  const collector = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      received.push({ url: req.url!, body });
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) =>
    collector.listen(0, "127.0.0.1", resolve),
  );
  const sdk = startTelemetry(
    `http://127.0.0.1:${(collector.address() as AddressInfo).port}`,
  )!;
  const http = createServer((req, res) =>
    httpTelemetry(req as Request, res as Response, () => {
      res.writeHead(503);
      res.end("unavailable");
    }),
  );
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  try {
    await fetch(
      `http://127.0.0.1:${(http.address() as AddressInfo).port}/private@example.com?token=secret-test`,
      { headers: { Authorization: "Bearer secret-test" } },
    );
    connectionsChanged(1);
    recordGameEvent("answer:submit", "ok", 0.01);
    connectionsChanged(-1);
    gameMetrics.sessionsRecovered(1);
    gameMetrics.sessionStarted();
    gameMetrics.sessionFinished();
    recordAnswer("accepted", "K7P2QX");
    recordAnswer("rejected", "late");
    recordAnswer("rejected", "K7P2QX");
    gameMetrics.questionClosed(0.25);
    recordLiveRateLimited();
    await sdk.shutdown();
    expect(
      received.some(
        (r) => r.url === "/v1/traces" && r.body.includes("kahoot-api"),
      ),
    ).toBe(true);
    const metrics = received
      .filter((r) => r.url === "/v1/metrics")
      .map((r) => r.body)
      .join("");
    for (const name of [
      "http.server.requests",
      "http.server.duration",
      "game.connections.active",
      "game.events",
      "game.event.duration",
      "game.sessions.active",
      "game.answers",
      "game.question.close.duration",
      "game.live.rate_limited",
    ])
      expect(metrics).toContain(name);
    const bodies = received.map((r) => r.body).join("");
    expect(bodies).not.toContain("secret-test");
    expect(bodies).not.toContain("private@example.com");
    expect(bodies).not.toContain("K7P2QX");
    const exported = received
      .filter((r) => r.url === "/v1/metrics")
      .flatMap((r) =>
        JSON.parse(r.body).resourceMetrics.flatMap((resource: any) =>
          resource.scopeMetrics.flatMap((scope: any) => scope.metrics),
        ),
      );
    const find = (name: string) =>
      exported.find((metric: any) => metric.name === name);
    const value = (point: any) => Number(point.asInt ?? point.asDouble);
    expect(value(find("game.sessions.active").gauge.dataPoints[0])).toBe(1);
    const answers = find("game.answers");
    expect(answers.unit).toBe("{answer}");
    expect(
      answers.sum.dataPoints.map((point: any) => ({
        value: value(point),
        attributes: Object.fromEntries(
          point.attributes.map((a: any) => [a.key, a.value.stringValue]),
        ),
      })),
    ).toEqual(
      expect.arrayContaining([
        { value: 1, attributes: { outcome: "accepted", reason: "none" } },
        { value: 1, attributes: { outcome: "rejected", reason: "late" } },
        { value: 1, attributes: { outcome: "rejected", reason: "other" } },
      ]),
    );
    const close = find("game.question.close.duration");
    expect(close.unit).toBe("s");
    expect(close.histogram.dataPoints[0].sum).toBe(0.25);
    expect(value(find("game.live.rate_limited").sum.dataPoints[0])).toBe(1);
  } finally {
    await new Promise<void>((resolve) => http.close(() => resolve()));
    await new Promise<void>((resolve) => collector.close(() => resolve()));
  }
});
