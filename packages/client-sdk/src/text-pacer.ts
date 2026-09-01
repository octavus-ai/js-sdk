/**
 * Client render smoothing (the "typewriter" pacer).
 *
 * Providers frame their streams at very different granularities - some emit
 * large multi-token deltas, so text lands in visible lumps. This module paces
 * already-received text and reasoning onto the screen at a steady cadence,
 * turning coarse provider bursts into smooth typing. It is a pure rendering
 * concern: it never changes the text itself, only how much of it is shown at a
 * given moment, and it is flushed immediately when a stream ends so completion
 * is never delayed.
 *
 * The reveal math (how many characters to show on a frame) is deliberately
 * pure - deterministic given its inputs, with no DOM or timer dependence -
 * and kept separate from the frame loop that drives it.
 */

/** How the pacer advances the revealed text. */
export type TextSmoothingGranularity = 'word' | 'char';

/**
 * Client render-smoothing option accepted by `OctavusChat`. `true` enables the
 * defaults (word-level); an object customizes granularity and base rate.
 */
export type TextSmoothingOption = boolean | TextSmoothingConfig;

export interface TextSmoothingConfig {
  /** Reveal whole words (default) or individual characters. */
  granularity?: TextSmoothingGranularity;
  /**
   * Baseline reveal rate in characters per second. The effective rate scales up
   * with the backlog so a fast model always catches up rather than lagging.
   */
  charsPerSecond?: number;
}

/** Fully-resolved smoothing settings (all defaults applied). */
export interface ResolvedTextSmoothing {
  granularity: TextSmoothingGranularity;
  charsPerSecond: number;
}

const DEFAULT_CHARS_PER_SECOND = 80;

/**
 * Window (seconds) over which any backlog is fully drained. A larger backlog is
 * revealed faster (backlog / window) so displayed text never falls arbitrarily
 * behind what has been received; a small backlog trickles at the base rate.
 */
const DRAIN_WINDOW_SECONDS = 0.3;

/** Fallback frame interval when `requestAnimationFrame` is unavailable. */
const FALLBACK_FRAME_MS = 16;

/**
 * Resolve the public `textSmoothing` option into concrete settings, or `null`
 * when smoothing is disabled (the default).
 */
export function resolveTextSmoothing(
  option: TextSmoothingOption | undefined,
): ResolvedTextSmoothing | null {
  if (option === undefined || option === false) return null;
  if (option === true) {
    return { granularity: 'word', charsPerSecond: DEFAULT_CHARS_PER_SECOND };
  }
  return {
    granularity: option.granularity ?? 'word',
    charsPerSecond:
      option.charsPerSecond !== undefined && option.charsPerSecond > 0
        ? option.charsPerSecond
        : DEFAULT_CHARS_PER_SECOND,
  };
}

/**
 * Compute the next revealed length for a single text/reasoning part.
 *
 * Pure and deterministic given its inputs. Guarantees forward progress (at
 * least one character per call while there is a backlog) and never exceeds the
 * full length, so completion is bounded regardless of frame timing.
 */
export function computeReveal(
  current: number,
  text: string,
  dtMs: number,
  config: ResolvedTextSmoothing,
): number {
  const full = text.length;
  if (current >= full) return full;

  const backlog = full - current;
  const dtSec = Math.max(0, dtMs) / 1000;
  // Base rate, raised so any backlog drains within DRAIN_WINDOW_SECONDS.
  const rate = Math.max(config.charsPerSecond, backlog / DRAIN_WINDOW_SECONDS);
  const advance = Math.max(1, Math.ceil(rate * dtSec));
  let next = current + advance;

  if (next >= full) return full;
  if (config.granularity === 'word') {
    next = snapToWordBoundary(text, next);
  }
  return Math.min(next, full);
}

/**
 * Extend an index forward to the end of the current word (and any trailing
 * whitespace) so a reveal boundary never lands mid-word inside received text.
 * The still-incomplete last word of the buffer is the deliberate exception:
 * the snap runs to the end of the buffer, so the tail word is revealed
 * progressively as it arrives - holding it back would stall the typing
 * mid-sentence and keep the frame loop running with nothing to do.
 */
export function snapToWordBoundary(text: string, index: number): number {
  const len = text.length;
  if (index >= len) return len;
  let i = index;
  while (i < len && !isWhitespace(text[i]!)) i += 1;
  while (i < len && isWhitespace(text[i]!)) i += 1;
  return i;
}

function isWhitespace(ch: string): boolean {
  return /\s/.test(ch);
}

/**
 * A minimal self-rescheduling frame loop. Prefers `requestAnimationFrame`
 * (browsers, React Native) and falls back to a timer elsewhere. The callback
 * returns whether to keep running, so the loop pauses itself once the backlog
 * drains and is re-armed by `ensureRunning()` when new text arrives.
 */
export class FrameScheduler {
  private handle: number | ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private lastTs = 0;
  private readonly useRaf: boolean;

  /** @param onFrame Receives elapsed ms; returns true to continue, false to stop. */
  constructor(private readonly onFrame: (dtMs: number) => boolean) {
    this.useRaf = typeof requestAnimationFrame === 'function';
  }

  ensureRunning(): void {
    if (this.running) return;
    this.running = true;
    this.lastTs = this.now();
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.handle === null) return;
    if (this.useRaf) {
      cancelAnimationFrame(this.handle as number);
    } else {
      clearTimeout(this.handle as ReturnType<typeof setTimeout>);
    }
    this.handle = null;
  }

  private readonly tick = (): void => {
    if (!this.running) return;
    const ts = this.now();
    const dt = ts - this.lastTs;
    this.lastTs = ts;
    const keepGoing = this.onFrame(dt);
    if (keepGoing && this.running) {
      this.scheduleNext();
    } else {
      this.stop();
    }
  };

  private scheduleNext(): void {
    this.handle = this.useRaf
      ? requestAnimationFrame(this.tick)
      : setTimeout(this.tick, FALLBACK_FRAME_MS);
  }

  private now(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }
}
