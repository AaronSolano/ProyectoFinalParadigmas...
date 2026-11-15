import request from "supertest";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config/config";
import { database } from "../src/data/database";

test("HTTP registra plantillas sin ids, credenciales, IP ni cuerpos", async () => {
  const config = loadConfig({
    KAHOOT_DATABASE_URL: "postgres://unused@localhost/unused",
    AUTH_BASE_URL: "http://localhost:3001",
    PUBLIC_API_URL: "http://localhost:3002",
  });
  const { app } = await createApp(config, database(config));
  const lines: string[] = [];
  const output = jest
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
  try {
    await request(app.getHttpServer())
      .get("/api/v1/quizzes/private-id?token=query-secret")
      .set("X-Request-Id", "request-id-secret")
      .set("X-Forwarded-For", "203.0.113.123")
      .expect(401);
    await request(app.getHttpServer())
      .post("/missing/private-name?token=url-secret")
      .set("Authorization", "Bearer header-secret")
      .send({
        email: "private@example.com",
        password: "PasswordPrivate123",
        answer: true,
      })
      .expect(404);
    await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    const rows = lines.map((line) => JSON.parse(line));
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.route)).toEqual([
      "/api/v1/quizzes/:quizId",
      "unmatched",
      "/api/v1/health",
    ]);
    expect(rows.map((row) => row.level)).toEqual(["warn", "warn", "info"]);
    expect(new Set(rows.map((row) => row.requestId)).size).toBe(3);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(
        [
          "ts",
          "level",
          "service",
          "method",
          "route",
          "status",
          "duration_ms",
          "requestId",
        ].sort(),
      );
      expect(row.service).toBe("kahoot-api");
      expect(row.duration_ms).toBeGreaterThanOrEqual(0);
      expect(row.requestId).toMatch(/^[0-9a-f-]{36}$/);
      expect(Number.isNaN(Date.parse(row.ts))).toBe(false);
    }
    expect(lines.join("")).not.toMatch(
      /private-id|private-name|private@example|PasswordPrivate|header-secret|query-secret|url-secret|request-id-secret|203\.0\.113|answer/,
    );
  } finally {
    output.mockRestore();
    await app.close();
  }
});
