import { Socket } from "socket.io";
import { GameGateway } from "../src/presentation/game-gateway";
import { GameService } from "../src/application/game-service";
import { AuthGuard } from "../src/auth/auth";
import { Config } from "../src/config/config";
import { liveEventLog } from "../src/live-log";

test("eventos aceptados, rechazados e inválidos no registran respuesta, sala o identidad", async () => {
  const answer = jest
    .fn()
    .mockResolvedValueOnce({
      event: "answer:accepted",
      payload: { answer: true, score: 1 },
    })
    .mockResolvedValueOnce({
      event: "answer:rejected",
      payload: { reason: "already_answered" },
    });
  const gateway = new GameGateway(
    { answer } as unknown as GameService,
    {} as AuthGuard,
    {} as Config,
  );
  const socket = {
    data: {
      identity: {
        id: "private-user-id",
        email: "private@example.com",
        displayName: "private-name",
      },
    },
    rooms: new Set(["session:ABC234"]),
    emit: jest.fn(),
  } as unknown as Socket;
  const lines: string[] = [];
  const output = jest
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
  try {
    await gateway["dispatch"](socket, "answer:submit", {
      code: "ABC234",
      questionIndex: 0,
      answer: true,
    });
    await gateway["dispatch"](socket, "answer:submit", {
      code: "ABC234",
      questionIndex: 0,
      answer: false,
    });
    await gateway["dispatch"](socket, "answer:submit", {
      token: "token-secret",
      password: "password-secret",
    });
    liveEventLog("private-event-secret", "rate_limited");
    const rows = lines.map((line) => JSON.parse(line));
    expect(rows.map((row) => row.outcome)).toEqual([
      "ok",
      "rejected",
      "error",
      "rate_limited",
    ]);
    expect(rows.map((row) => row.event)).toEqual([
      "answer:submit",
      "answer:submit",
      "answer:submit",
      "unknown",
    ]);
    for (const row of rows)
      expect(Object.keys(row).sort()).toEqual(
        ["ts", "level", "service", "event", "outcome"].sort(),
      );
    expect(lines.join("")).not.toMatch(
      /ABC234|private-|token-secret|password-secret|true|false|already_answered/,
    );
  } finally {
    output.mockRestore();
  }
});
