export interface GameMetrics {
  sessionsRecovered(count: number): void;
  sessionStarted(): void;
  sessionFinished(): void;
  questionClosed(delaySeconds: number): void;
}
export const noGameMetrics: GameMetrics = {
  sessionsRecovered() {},
  sessionStarted() {},
  sessionFinished() {},
  questionClosed() {},
};
