export class Problem extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export function requireOwner(actual: string, expected: string): void {
  if (actual !== expected)
    throw new Problem(
      403,
      "FORBIDDEN",
      "No tienes permiso para realizar esta accion.",
    );
}
