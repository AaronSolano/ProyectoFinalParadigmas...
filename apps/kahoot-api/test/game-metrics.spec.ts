import { GameService } from "../src/application/game-service";
import { GameSession } from "../src/domain/game";
import { GameStore, GameTransaction } from "../src/domain/ports/game-store";
test("métricas siguen inicio, recuperación, publicación del cierre y fin sin exponer identidad", async () => {
  let now = 1000;
  const session: GameSession = {
    id: "session",
    code: "ABC234",
    hostId: "host",
    status: "waiting",
    questionTimeSeconds: 5,
    currentIndex: null,
    closesAt: null,
    lastClosed: null,
  };
  const tx: GameTransaction = {
    session,
    participants: async () => [],
    questions: async () => [
      {
        index: 0,
        statement: "Pregunta",
        correctAnswer: true,
        imageFilename: null,
      },
    ],
    answers: async () => [],
    join: async () => {
      throw new Error("unused");
    },
    leave: async () => {},
    insertAnswer: async () => true,
    open: async (index, deadline) => {
      Object.assign(session, {
        status: "question_open",
        currentIndex: index,
        closesAt: deadline,
      });
    },
    close: async (result) => {
      Object.assign(session, { status: "question_closed", lastClosed: result });
    },
    finish: async () => {
      session.status = "finished";
    },
  };
  const store: GameStore = {
    transaction: async (_code, work) => work(tx),
    openSessions: async () => [],
    activeSessionCount: async () =>
      session.status === "question_open" || session.status === "question_closed"
        ? 1
        : 0,
  };
  const metrics = {
    sessionsRecovered: jest.fn(),
    sessionStarted: jest.fn(),
    sessionFinished: jest.fn(),
    questionClosed: jest.fn(),
  };
  const game = new GameService(
    store,
    "http://localhost",
    { now: () => now },
    metrics,
  );
  try {
    await game.recover();
    expect(metrics.sessionsRecovered).toHaveBeenLastCalledWith(0);
    await game.control({ id: "host", name: "Host" }, "ABC234", "start");
    expect(metrics.sessionStarted).toHaveBeenCalledTimes(1);
    now = 5900;
    game.events = {
      room: (_code, event) => {
        if (event === "question:closed") now = 6250;
      },
    };
    await game.control({ id: "host", name: "Host" }, "ABC234", "close");
    expect(metrics.questionClosed).toHaveBeenLastCalledWith(0.25);
    await game.recover();
    expect(metrics.sessionsRecovered).toHaveBeenLastCalledWith(1);
    await game.control({ id: "host", name: "Host" }, "ABC234", "next");
    expect(metrics.sessionFinished).toHaveBeenCalledTimes(1);
    session.status = "waiting";
    session.currentIndex = null;
    session.closesAt = null;
    now = 10000;
    game.events = { room() {} };
    await game.control({ id: "host", name: "Host" }, "ABC234", "start");
    await game.control({ id: "host", name: "Host" }, "ABC234", "close");
    expect(metrics.questionClosed).toHaveBeenLastCalledWith(0);
  } finally {
    await game.onModuleDestroy();
  }
});
