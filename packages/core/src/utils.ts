/**
 * Generate a unique ID for messages, tool calls, etc.
 * Format: timestamp-random (e.g., "1702345678901-abc123def")
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if an error is an abort error.
 *
 * This handles the various ways abort errors can manifest across different
 * environments (browsers, Node.js, Next.js, etc.).
 *
 * @param error - The error to check
 * @returns True if the error is an abort error
 */
export function isAbortError(error: unknown): error is Error {
  return (
    (error instanceof Error || error instanceof DOMException) &&
    (error.name === 'AbortError' ||
      error.name === 'ResponseAborted' || // Next.js
      error.name === 'TimeoutError')
  );
}
