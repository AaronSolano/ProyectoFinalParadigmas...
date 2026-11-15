import { context, metrics, trace } from "@opentelemetry/api";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import request from "supertest";
import { startTelemetry } from "../src/telemetry";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config/config";
import { database } from "../src/data/database";

const config = loadConfig({
  KAHOOT_DATABASE_URL: "postgres://unused:unused@localhost/unused",
  AUTH_BASE_URL: "http://localhost:3001",
  PUBLIC_API_URL: "http://localhost:3002",
});
afterEach(() => {
  trace.disable();
  metrics.disable();
  context.disable();
});

test("exporta trazas y métricas HTTP con nombre kahoot-api", async () => {
  const received: { url: string; body: string }[] = [];
  const collector = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      received.push({ url: req.url!, body });
      res.writeHead(200, { "content-type": "application/json" }).end("{}");
    });
  });
  await new Promise<void>((resolve) =>
    collector.listen(0, "127.0.0.1", resolve),
  );
  const sdk = startTelemetry(
    `http://127.0.0.1:${(collector.address() as AddressInfo).port}`,
  )!;
  const { app } = await createApp(config, database(config));
  try {
    await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    await sdk.shutdown();
    expect(
      received.some(
        (item) => item.url === "/v1/traces" && item.body.includes("kahoot-api"),
      ),
    ).toBe(true);
    expect(
      received.some(
        (item) =>
          item.url === "/v1/metrics" &&
          item.body.includes("http.server.requests"),
      ),
    ).toBe(true);
    expect(
      received.some(
        (item) =>
          item.url === "/v1/metrics" &&
          item.body.includes("http.server.duration"),
      ),
    ).toBe(true);
  } finally {
    await app.close();
    await new Promise<void>((resolve) => collector.close(() => resolve()));
  }
});

test.each(["", "http://127.0.0.1:1"])(
  "arranca y responde sin colector disponible: %s",
  async (endpoint) => {
    const sdk = startTelemetry(endpoint);
    const { app } = await createApp(config, database(config));
    try {
      await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    } finally {
      await app.close();
      await sdk?.shutdown().catch(() => undefined);
    }
  },
);
