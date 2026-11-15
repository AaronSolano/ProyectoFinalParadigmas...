import { Problem } from "./problem";
import { Session } from "./entities";
export function normalizeRoomCode(code: string): string {
  const normalized = code.toUpperCase();
  if (!/^[2-9A-HJ-NP-Z]{6}$/.test(normalized))
    throw new Problem(
      404,
      "ROOM_NOT_FOUND",
      "No existe una sala con ese codigo.",
    );
  return normalized;
}
export function requireWaiting(session: Session): void {
  if (session.status !== "waiting")
    throw new Problem(
      409,
      "ROOM_CLOSED",
      "La sala ya no admite nuevos participantes.",
    );
}
