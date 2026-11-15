import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { Request, Response } from "express";
import {
  startTelemetry,
  httpTelemetry,
  recordGameEvent,
  connectionsChanged,
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
    ])
      expect(metrics).toContain(name);
    const bodies = received.map((r) => r.body).join("");
    expect(bodies).not.toContain("secret-test");
    expect(bodies).not.toContain("private@example.com");
  } finally {
    await new Promise<void>((resolve) => http.close(() => resolve()));
    await new Promise<void>((resolve) => collector.close(() => resolve()));
  }
});
