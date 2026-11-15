/** Sliding one-second window. Three consecutive overflows disconnect only this socket. */
export class LiveEventBudget {
  private accepted: number[] = [];
  private overflows = 0;
  constructor(
    private readonly limit: number,
    private readonly now: () => number = () => performance.now(),
  ) {}
  take(): "allow" | "drop" | "disconnect" {
    const now = this.now();
    while (this.accepted.length && this.accepted[0] <= now - 1000)
      this.accepted.shift();
    if (this.accepted.length >= this.limit)
      return ++this.overflows >= 3 ? "disconnect" : "drop";
    this.accepted.push(now);
    this.overflows = 0;
    return "allow";
  }
}
