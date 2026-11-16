import { GameService } from "../src/application/game-service";
import { GameSession } from "../src/domain/game";
import { GameStore, GameTransaction } from "../src/domain/ports/game-store";

test("recuperar salas cerradas respeta sus tiempos distintos y mantiene apagado el avance manual", async () => {
  jest.useFakeTimers();
  const sessions = new Map<string, GameSession>();
  for (const [code, ms] of [
    ["ABC234", 0],
    ["ABC235", 1000],
    ["ABC236", 3000],
  ] as const)
    sessions.set(code, {
      id: code,
      code,
      hostId: "host",
      status: "question_closed",
      questionTimeSeconds: 5,
      autoAdvanceMs: ms,
      currentIndex: 0,
      openedAt: 0,
      closesAt: 5000,
      lastClosed: null,
    });
  const store: GameStore = {
    activeSessionCount: async () => 3,
    openSessions: async () => [],
    closedSessions: async () =>
      [...sessions.values()].map((s) => ({
        code: s.code,
        index: 0,
        autoAdvanceMs: s.autoAdvanceMs,
      })),
    transaction: async (code, work) => {
      const session = sessions.get(code)!;
      return work({
        session,
        questions: async () => [],
        participants: async () => [],
        finish: async () => {
          session.status = "finished";
        },
      } as unknown as GameTransaction);
    },
  };
  const game = new GameService(store, "http://localhost");
  const published = jest.fn();
  game.events = { room: published };
  try {
    await game.recover();
    await jest.advanceTimersByTimeAsync(999);
    expect(published).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(sessions.get("ABC235")!.status).toBe("finished");
    expect(sessions.get("ABC236")!.status).toBe("question_closed");
    await jest.advanceTimersByTimeAsync(2000);
    expect(sessions.get("ABC236")!.status).toBe("finished");
    expect(sessions.get("ABC234")!.status).toBe("question_closed");
    expect(published).toHaveBeenCalledTimes(2);
    expect(published).toHaveBeenCalledWith("ABC235", "session:finished", {
      ranking: [],
    });
  } finally {
    await game.onModuleDestroy();
    jest.useRealTimers();
  }
});
