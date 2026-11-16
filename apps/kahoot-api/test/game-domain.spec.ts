import {
  transition,
  answerRejection,
  points,
  streak,
  rank,
  GameStatus,
} from "../src/domain/game";
describe("reglas de partida puras", () => {
  test("ciclo completo y avance tras el cierre", () => {
    expect(transition("waiting", "start")).toBe("question_open");
    expect(transition("question_open", "close")).toBe("question_closed");
    expect(transition("question_closed", "next", true)).toBe("question_open");
    expect(transition("question_closed", "next", false)).toBe("finished");
  });
  test.each([
    "waiting",
    "question_open",
    "question_closed",
    "finished",
  ] as GameStatus[])("rechaza controles inválidos en %s", (status) => {
    for (const command of ["start", "next", "close"] as const) {
      const allowed =
        (status === "waiting" && command === "start") ||
        (status === "question_open" && command === "close") ||
        (status === "question_closed" && command === "next");
      if (!allowed)
        expect(() => transition(status, command)).toThrow("estado actual");
    }
  });
  const valid = {
    participant: true,
    status: "question_open" as GameStatus,
    currentIndex: 0,
    questionIndex: 0,
    closesAt: 1000,
    now: 900,
    answered: false,
  };
  test("acepta hasta el plazo inclusive, nunca después", () => {
    expect(answerRejection(valid)).toBeUndefined();
    expect(answerRejection({ ...valid, now: 1000 })).toBeUndefined();
    expect(answerRejection({ ...valid, now: 1001 })).toBe("late");
  });
  test("reenvíos, falta de membresía, pregunta equivocada y cierre", () => {
    expect(answerRejection({ ...valid, answered: true })).toBe(
      "already_answered",
    );
    expect(answerRejection({ ...valid, participant: false })).toBe(
      "not_in_session",
    );
    expect(answerRejection({ ...valid, questionIndex: 1 })).toBe(
      "invalid_state",
    );
    expect(
      answerRejection({ ...valid, status: "waiting", currentIndex: null }),
    ).toBe("invalid_state");
    expect(answerRejection({ ...valid, status: "question_closed" })).toBe(
      "closed",
    );
    expect(answerRejection({ ...valid, status: "finished" })).toBe("closed");
  });
  test.each([
    [0, 0, 1000],
    [1, 1, 1000],
    [0, 1, 0],
    [1, 0, 0],
    [undefined, 0, 0],
    [undefined, 1, 0],
  ])("puntaje %s / %s = %s", (answer, correct, result) => {
    expect(
      points({
        option: answer as number | undefined,
        correctOption: correct as number,
        elapsedMs: 0,
        durationMs: 5000,
      }),
    ).toBe(result);
  });
  test.each([
    [0, 1000],
    [499, 1000],
    [500, 950],
    [2500, 750],
    [4999, 500],
    [5000, 500],
    [5001, 500],
    [null, 0],
    [-1, 0],
    [NaN, 0],
  ])("puntaje por velocidad a %s ms = %s", (elapsedMs, expected) => {
    expect(
      points({
        option: 0,
        correctOption: 0,
        elapsedMs,
        durationMs: 5000,
      }),
    ).toBe(expected);
  });
  test("duración inválida no genera puntos; base configurable respeta la fórmula", () => {
    expect(
      points({
        option: 0,
        correctOption: 0,
        elapsedMs: 500,
        durationMs: 0,
      }),
    ).toBe(0);
    expect(
      points({
        option: 0,
        correctOption: 0,
        elapsedMs: 2500,
        durationMs: 5000,
        basePoints: 800,
      }),
    ).toBe(600);
    expect(
      points({
        option: 0,
        correctOption: 0,
        elapsedMs: 499,
        durationMs: 5000,
        basePoints: 800,
      }),
    ).toBe(800);
  });
  test("la racha aumenta por acierto y se reinicia por error o ausencia sin bonificación", () => {
    expect(streak(0, true)).toBe(1);
    expect(streak(4, true)).toBe(5);
    expect(streak(4, false)).toBe(0);
    expect(streak(streak(4, false), true)).toBe(1);
  });
  test("empates comparten posición densa sin mutar la entrada", () => {
    const players = [
      { participantId: "c", displayName: "C", score: 0 },
      { participantId: "b", displayName: "B", score: 2 },
      { participantId: "a", displayName: "A", score: 2 },
    ];
    expect(rank(players).map((r) => [r.participantId, r.position])).toEqual([
      ["a", 1],
      ["b", 1],
      ["c", 2],
    ]);
    expect(players[0].participantId).toBe("c");
    expect(rank([])).toEqual([]);
  });
});
