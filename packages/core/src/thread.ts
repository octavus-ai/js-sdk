/**
 * Default thread name when none is specified.
 */
export const MAIN_THREAD = 'main' as const;

/**
 * Resolve a thread name, defaulting to main thread.
 */
export function resolveThread(thread: string | undefined): string {
  return thread ?? MAIN_THREAD;
}

/**
 * Check if a thread is the main thread.
 */
export function isMainThread(thread: string | undefined): boolean {
  return thread === undefined || thread === MAIN_THREAD;
}

/**
 * Normalize thread for storage in message parts.
 * Main thread is stored as undefined to save space.
 */
export function threadForPart(thread: string | undefined): string | undefined {
  return isMainThread(thread) ? undefined : thread;
}

/**
 * Check if a message part belongs to a non-main thread.
 * Non-main thread content (e.g., "summary") is typically displayed differently.
 */
export function isOtherThread(part: { thread?: string }): boolean {
  return !isMainThread(part.thread);
}
