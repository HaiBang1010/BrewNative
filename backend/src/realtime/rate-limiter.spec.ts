import { SlidingWindowLimiter } from './rate-limiter.js';

describe('SlidingWindowLimiter', () => {
  it('allows up to the limit within the window, then blocks', () => {
    const limiter = new SlidingWindowLimiter(2, 1_000);
    expect(limiter.tryHit('a', 0)).toBe(true);
    expect(limiter.tryHit('a', 10)).toBe(true);
    expect(limiter.tryHit('a', 20)).toBe(false);
    expect(limiter.tryHit('b', 20)).toBe(true);
  });

  it('allows again once old hits leave the window', () => {
    const limiter = new SlidingWindowLimiter(1, 1_000);
    expect(limiter.tryHit('a', 0)).toBe(true);
    expect(limiter.tryHit('a', 999)).toBe(false);
    expect(limiter.tryHit('a', 1_000)).toBe(true);
  });

  it('forgets idle keys', () => {
    const limiter = new SlidingWindowLimiter(5, 1_000);
    for (let i = 0; i < 100; i++) limiter.tryHit(`user-${i}`, 0);
    expect(limiter.size).toBe(100);
    limiter.tryHit('someone', 5_000);
    expect(limiter.size).toBe(1);
  });
});
