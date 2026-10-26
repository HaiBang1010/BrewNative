/**
 * In-memory sliding-window limit: at most `limit` hits per key within `windowMs`.
 * Keys whose hits are all older than the window are swept regularly, so memory
 * stays proportional to recently active users, not all users ever seen.
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records a hit and returns false if `key` is over the limit (the hit is then not counted). */
  tryHit(key: string, now = Date.now()): boolean {
    this.sweep(now);
    const recent = (this.hits.get(key) ?? []).filter(
      (t) => now - t < this.windowMs,
    );
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  get size(): number {
    return this.hits.size;
  }

  private sweep(now: number): void {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    for (const [key, times] of this.hits) {
      if (!times.length || now - times[times.length - 1] >= this.windowMs) {
        this.hits.delete(key);
      }
    }
  }
}
