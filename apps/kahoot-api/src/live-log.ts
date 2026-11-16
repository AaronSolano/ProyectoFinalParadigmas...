const events = new Set([
  "session:join",
  "session:leave",
  "session:start",
  "question:next",
  "question:close",
  "answer:submit",
]);
export function isLiveEvent(event: string) {
  return events.has(event);
}
export function liveEventLog(
  event: string,
  outcome: "ok" | "rejected" | "error" | "rate_limited" | "ignored",
) {
  process.stdout.write(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: outcome === "ok" || outcome === "ignored" ? "info" : "warn",
      service: "kahoot-api",
      event: events.has(event) ? event : "unknown",
      outcome,
    }) + "\n",
  );
}
