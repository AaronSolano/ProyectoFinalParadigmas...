import { GameStore, GameTransaction } from "../domain/ports/game-store";
import { GameMetrics, noGameMetrics } from "../domain/ports/game-metrics";
import {
  Clock,
  systemClock,
  GameError,
  GameQuestion,
  GameSession,
  Control,
  transition,
  answerRejection,
  points,
  streak,
  rank,
  QuestionClosed,
} from "../domain/game";
export interface GameIdentity {
  id: string;
  name: string;
}
export interface GameEvents {
  room(code: string, event: string, payload: unknown): void;
}
const noEvents: GameEvents = { room() {} };
/** All transitions, answers, commits and publications are ordered per room. */
export class GameService {
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private stopped = false;
  events: GameEvents = noEvents;
  constructor(
    private readonly store: GameStore,
    private readonly publicUrl: string,
    private readonly clock: Clock = systemClock,
    private readonly metrics: GameMetrics = noGameMetrics,
  ) {}
  private serial<T>(code: string, work: () => Promise<T>): Promise<T> {
    const previous = this.pending.get(code) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(work);
    this.pending.set(code, next);
    void next
      .finally(() => {
        if (this.pending.get(code) === next) this.pending.delete(code);
      })
      .catch(() => undefined);
    return next;
  }
  private question(s: GameSession, q: GameQuestion, total: number) {
    return {
      questionIndex: q.index,
      total,
      statement: q.statement,
      options: q.options,
      imageUrl: q.imageFilename
        ? `${this.publicUrl}/api/v1/images/${q.imageFilename}`
        : null,
      closesAt: new Date(s.closesAt!).toISOString(),
      openedAt: new Date(
        s.openedAt ?? s.closesAt! - s.questionTimeSeconds * 1000,
      ).toISOString(),
      durationSeconds: s.questionTimeSeconds,
    };
  }
  private async state(tx: GameTransaction, user: GameIdentity) {
    const s = tx.session,
      players = await tx.participants(),
      questions = await tx.questions();
    const me = players.find((p) => p.userId === user.id),
      q = questions.find((q) => q.index === s.currentIndex);
    return {
      code: s.code,
      status: s.status,
      isHost: s.hostId === user.id,
      participantId: me?.id ?? null,
      participants: players
        .filter((p) => p.active)
        .map((p) => ({ id: p.id, displayName: p.displayName })),
      totalQuestions: questions.length,
      currentQuestion:
        q && (s.status === "question_open" || s.status === "question_closed")
          ? this.question(s, q, questions.length)
          : null,
      closesAt:
        s.status === "question_open"
          ? new Date(s.closesAt!).toISOString()
          : null,
      serverTime: new Date(this.clock.now()).toISOString(),
      myScore: me?.score ?? 0,
      hasAnswered:
        !!me &&
        s.currentIndex !== null &&
        (await tx.answers(s.currentIndex)).some(
          (a) => a.participantId === me.id,
        ),
      ...(s.status === "question_closed" ? { lastClosed: s.lastClosed } : {}),
      ...(s.status === "finished"
        ? {
            ranking: rank(
              players.map((p) => ({
                participantId: p.id,
                displayName: p.displayName,
                score: p.score,
              })),
            ),
          }
        : {}),
    };
  }
  join(
    user: GameIdentity,
    code: string,
    admit: (state: unknown) => Promise<void>,
  ) {
    return this.serial(code, async () => {
      const result = await this.store.transaction(code, async (tx) => {
        const existing = (await tx.participants()).find(
          (p) => p.userId === user.id,
        );
        let created;
        if (tx.session.hostId !== user.id || existing) {
          if (!existing && tx.session.status !== "waiting")
            throw new GameError(
              "INVALID_STATE",
              "La sala ya no admite participantes nuevos.",
            );
          const p = await tx.join(user.id, user.name);
          if (!existing) created = { id: p.id, displayName: p.displayName };
        }
        return { state: await this.state(tx, user), created };
      });
      await admit(result.state);
      if (result.created)
        this.events.room(code, "participant:joined", {
          participant: result.created,
        });
    });
  }
  /** REST admission uses the same room queue and publishes only after commit. */
  joinFromRest<T>(
    code: string,
    work: () => Promise<{
      participant: T;
      joined?: { id: string; displayName: string };
    }>,
  ): Promise<T> {
    return this.serial(code, async () => {
      const result = await work();
      if (result.joined)
        this.events.room(code, "participant:joined", {
          participant: result.joined,
        });
      return result.participant;
    });
  }
  leave(
    user: GameIdentity,
    code: string,
    remove: () => Promise<void>,
    stillPresent: () => boolean,
  ) {
    return this.serial(code, async () => {
      // Leaving one tab must not remove another tab for the same identity.
      await remove();
      if (stillPresent()) return;
      const id = await this.store.transaction(code, async (tx) => {
        const p = (await tx.participants()).find(
          (p) => p.userId === user.id && p.active,
        );
        if (!p) return;
        await tx.leave(p.id);
        return p.id;
      });
      if (id) this.events.room(code, "participant:left", { participantId: id });
    });
  }
  control(user: GameIdentity, code: string, control: Control) {
    return this.serial(code, async () => {
      const result = await this.store.transaction(code, async (tx) => {
        const s = tx.session;
        if (s.hostId !== user.id)
          throw new GameError(
            "FORBIDDEN",
            "Solo el anfitrión puede controlar la partida.",
          );
        const questions = await tx.questions(),
          next = control === "start" ? 0 : (s.currentIndex ?? -1) + 1;
        const target = transition(s.status, control, next < questions.length);
        if (target === "question_closed")
          return {
            closed: await this.closeQuestion(tx),
            closedDeadline: s.closesAt!,
            deadline: null,
          };
        if (target === "finished") {
          const ranking = rank(
            (await tx.participants()).map((p) => ({
              participantId: p.id,
              displayName: p.displayName,
              score: p.score,
            })),
          );
          await tx.finish(ranking, this.clock.now());
          return { finished: { ranking }, deadline: null };
        }
        if (!questions[next])
          throw new GameError("INVALID_STATE", "La sala no tiene preguntas.");
        const now = this.clock.now(),
          deadline = now + s.questionTimeSeconds * 1000;
        await tx.open(next, deadline, now);
        return {
          started:
            control === "start"
              ? { totalQuestions: questions.length }
              : undefined,
          opened: {
            ...this.question(s, questions[next], questions.length),
            serverTime: new Date(now).toISOString(),
          },
          deadline,
        };
      });
      this.cancelTimer(code);
      if (result.started) {
        this.metrics.sessionStarted();
        this.events.room(code, "session:started", result.started);
      }
      if (result.opened)
        this.events.room(code, "question:opened", result.opened);
      if (result.closed) {
        this.events.room(code, "question:closed", result.closed);
        this.metrics.questionClosed(
          Math.max(0, (this.clock.now() - result.closedDeadline!) / 1000),
        );
      }
      if (result.finished) {
        this.metrics.sessionFinished();
        this.events.room(code, "session:finished", result.finished);
      }
      if (result.deadline !== null) this.schedule(code, result.deadline);
    });
  }
  answer(
    user: GameIdentity,
    code: string,
    questionIndex: number,
    option: number,
    joined: boolean,
  ) {
    const receivedAt = this.clock.now();
    return this.serial(code, () =>
      this.store.transaction(code, async (tx) => {
        const s = tx.session,
          me = (await tx.participants()).find(
            (p) => p.userId === user.id && p.active,
          );
        const existing =
          s.currentIndex === null ? [] : await tx.answers(s.currentIndex);
        const reason = answerRejection({
          participant: joined && !!me,
          status: s.status,
          currentIndex: s.currentIndex,
          questionIndex,
          closesAt: s.closesAt,
          now: receivedAt,
          answered: existing.some((a) => a.participantId === me?.id),
        });
        if (reason)
          return {
            event: "answer:rejected",
            payload: { questionIndex, reason },
          };
        const inserted = await tx.insertAnswer(
          me!.id,
          questionIndex,
          option,
          receivedAt,
        );
        return inserted
          ? { event: "answer:accepted", payload: { questionIndex } }
          : {
              event: "answer:rejected",
              payload: { questionIndex, reason: "already_answered" },
            };
      }),
    );
  }
  private async closeQuestion(tx: GameTransaction): Promise<QuestionClosed> {
    const s = tx.session,
      q = (await tx.questions()).find((q) => q.index === s.currentIndex)!;
    const answers = await tx.answers(q.index),
      players = await tx.participants();
    const results = players.map((p) => {
      const answer = answers.find((a) => a.participantId === p.id),
        durationMs = s.questionTimeSeconds * 1000,
        openedAt = s.openedAt ?? s.closesAt! - durationMs,
        elapsedMs = answer
          ? Math.max(0, Math.min(durationMs, answer.receivedAt - openedAt))
          : null,
        correct = answer !== undefined && answer.option === q.correctOption,
        awarded = points({
          option: answer?.option,
          correctOption: q.correctOption,
          elapsedMs,
          durationMs,
        });
      return {
        participantId: p.id,
        answered: !!answer,
        correct,
        pointsAwarded: awarded,
        elapsedMs,
        streak: streak(p.streak, correct),
        totalScore: p.score + awarded,
      };
    });
    const ranking = rank(
      players.map((p) => ({
        participantId: p.id,
        displayName: p.displayName,
        score: results.find((r) => r.participantId === p.id)!.totalScore,
      })),
    );
    const closed = {
      questionIndex: q.index,
      correctOption: q.correctOption,
      results,
      ranking,
    };
    await tx.close(closed);
    return closed;
  }
  private cancelTimer(code: string) {
    const timer = this.timers.get(code);
    if (timer) clearTimeout(timer);
    this.timers.delete(code);
  }
  private schedule(code: string, deadline: number, retry = false) {
    if (this.stopped) return;
    this.cancelTimer(code);
    const timer = setTimeout(
      () => {
        void this.expire(code).catch(() => this.schedule(code, deadline, true));
      },
      retry
        ? 1000
        : Math.max(0, Math.min(2147483647, deadline - this.clock.now())),
    );
    timer.unref();
    this.timers.set(code, timer);
  }
  private expire(code: string) {
    return this.serial(code, async () => {
      const result = await this.store.transaction(code, async (tx) => {
        if (tx.session.status !== "question_open") return {};
        if (this.clock.now() < tx.session.closesAt!)
          return { deadline: tx.session.closesAt! };
        return {
          closed: await this.closeQuestion(tx),
          closedDeadline: tx.session.closesAt!,
        };
      });
      this.cancelTimer(code);
      if (result.closed) {
        this.events.room(code, "question:closed", result.closed);
        this.metrics.questionClosed(
          Math.max(0, (this.clock.now() - result.closedDeadline!) / 1000),
        );
      }
      if (result.deadline !== undefined) this.schedule(code, result.deadline);
    });
  }
  async recover() {
    this.stopped = false;
    this.metrics.sessionsRecovered(await this.store.activeSessionCount());
    for (const room of await this.store.openSessions()) {
      if (room.closesAt <= this.clock.now()) await this.expire(room.code);
      else this.schedule(room.code, room.closesAt);
    }
  }
  async onModuleDestroy() {
    this.stopped = true;
    for (const code of this.timers.keys()) this.cancelTimer(code);
    await Promise.allSettled(this.pending.values());
  }
}
