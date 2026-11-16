import { liveEventLog, isLiveEvent } from "../live-log";
import { Inject } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Namespace, Socket } from "socket.io";
import { GameService } from "../application/game-service";
import { AuthGuard, Identity } from "../auth/auth";
import { Config } from "../config/config";
import { GameError } from "../domain/game";
import { GameSchemas } from "./game-schemas";
import { LiveEventBudget } from "./live-event-budget";
import {
  connectionsChanged,
  recordGameEvent,
  recordAnswer,
  recordLiveRateLimited,
} from "../telemetry";
@WebSocketGateway({ namespace: "/game", maxHttpBufferSize: 16384 })
export class GameGateway implements OnGatewayInit {
  @WebSocketServer() server!: Namespace;
  private readonly schemas = new GameSchemas();
  constructor(
    private readonly game: GameService,
    private readonly auth: AuthGuard,
    @Inject("CONFIG") private readonly config: Config,
  ) {}
  afterInit(server: Namespace) {
    this.game.events = {
      room: (code, event, payload) =>
        server.to(`session:${code}`).emit(event, payload),
    };
    server.use(async (socket, next) => {
      try {
        const origin = socket.handshake.headers.origin;
        if (origin && !this.config.cors.includes(origin))
          throw new Error("origin");
        const auth = socket.handshake.auth;
        if (!this.schemas.valid("Autenticación del handshake", auth))
          throw new Error("token");
        socket.data.identity = await this.auth.authenticate(auth.token);
        next();
      } catch {
        next(new Error("unauthorized"));
      }
    });
    server.on("connection", (socket) => {
      const budget = new LiveEventBudget(this.config.liveMaxEventsPerSecond);
      socket.use((_packet, next) => {
        if (!socket.connected) return;
        const decision = budget.take();
        if (decision === "allow") {
          if (!isLiveEvent(String(_packet[0])))
            liveEventLog("unknown", "ignored");
          next();
        } else {
          liveEventLog(String(_packet[0]), "rate_limited");
          if (decision !== "disconnect") return;
          recordLiveRateLimited();
          socket.disconnect(true);
        }
      });
      connectionsChanged(1);
      socket.once("disconnect", () => connectionsChanged(-1));
      for (const event of [
        "session:join",
        "session:leave",
        "session:start",
        "question:next",
        "question:close",
        "answer:submit",
      ]) {
        socket.on(event, (payload: unknown) => {
          void this.dispatch(socket, event, payload);
        });
      }
    });
  }
  private async dispatch(socket: Socket, event: string, payload: unknown) {
    const started = performance.now();
    let outcome: "ok" | "rejected" | "error" = "ok";
    try {
      if (!this.schemas.valid(event, payload))
        throw new GameError(
          "INVALID_PAYLOAD",
          "Los datos del evento no son válidos.",
        );
      const input = payload as {
          code: string;
          questionIndex: number;
          answer: boolean;
        },
        room = `session:${input.code}`;
      const user = socket.data.identity as Identity;
      if (event === "session:join") {
        await this.game.join(user, input.code, async (state) => {
          if (!socket.connected) return;
          await socket.join(room);
          socket.emit("state_sync", state);
        });
      } else if (event === "answer:submit") {
        const result = await this.game.answer(
          user,
          input.code,
          input.questionIndex,
          input.answer,
          socket.rooms.has(room),
        );
        socket.emit(result.event, result.payload);
        recordAnswer(
          result.event === "answer:accepted" ? "accepted" : "rejected",
          "reason" in result.payload ? result.payload.reason : "none",
        );
        outcome = result.event === "answer:rejected" ? "rejected" : "ok";
      } else if (event === "session:leave") {
        await this.game.leave(
          user,
          input.code,
          async () => {
            await socket.leave(room);
          },
          () =>
            [...this.server.sockets.values()].some(
              (s) => s.data.identity?.id === user.id && s.rooms.has(room),
            ),
        );
      } else {
        if (!socket.rooms.has(room))
          throw new GameError(
            "FORBIDDEN",
            "Debes unirte a la sala antes de controlarla.",
          );
        await this.game.control(
          user,
          input.code,
          event === "session:start"
            ? "start"
            : event === "question:next"
              ? "next"
              : "close",
        );
      }
    } catch (error) {
      outcome = "error";
      const known = error instanceof GameError;
      if (event === "answer:submit")
        recordAnswer(
          "rejected",
          known ? error.code.toLowerCase() : "internal_error",
        );
      socket.emit("error", {
        code: known ? error.code : "INTERNAL_ERROR",
        message: known ? error.message : "Error interno del servicio.",
      });
    } finally {
      liveEventLog(event, outcome);
      recordGameEvent(event, outcome, (performance.now() - started) / 1000);
    }
  }
}
