import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

// Only allowlisted fields reach stdout. Never serialize requests or errors.
export function httpRequestLog(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const started = performance.now();
  const requestId = randomUUID();
  let written = false;
  const write = () => {
    if (written) return;
    written = true;
    const status = res.writableFinished ? res.statusCode : 499;
    const route =
      typeof req.route?.path === "string" ? req.route.path : "unmatched";
    const method = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ].includes(req.method)
      ? req.method
      : "OTHER";
    process.stdout.write(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
        service: "kahoot-api",
        method,
        route,
        status,
        duration_ms: Math.round((performance.now() - started) * 1000) / 1000,
        requestId,
      }) + "\n",
    );
  };
  res.once("finish", write);
  res.once("close", write);
  next();
}
