import { isAbortError } from '@octavus/core';
import { parseSSEStream } from '@/stream/reader';
import type { Transport } from './types';

/**
 * Request options passed to the triggerRequest function.
 */
export interface TriggerRequestOptions {
  /** Abort signal to cancel the request */
  signal?: AbortSignal;
}

/**
 * Options for creating an HTTP transport.
 */
export interface HttpTransportOptions {
  /**
   * Function to make the trigger request.
   * Called each time `send()` is invoked on the chat.
   *
   * @param triggerName - The trigger name (e.g., 'user-message')
   * @param input - Input parameters for the trigger
   * @param options - Optional request options including abort signal
   * @returns Response with SSE stream body
   *
   * @example
   * ```typescript
   * triggerRequest: (triggerName, input, options) =>
   *   fetch('/api/octavus', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify({ sessionId, triggerName, input }),
   *     signal: options?.signal,
   *   }),
   * ```
   */
  triggerRequest: (
    triggerName: string,
    input?: Record<string, unknown>,
    options?: TriggerRequestOptions,
  ) => Promise<Response>;
}

/**
 * Create an HTTP transport using native fetch() and SSE parsing.
 * This is the default transport for Next.js and other HTTP-based applications.
 *
 * @example
 * ```typescript
 * const transport = createHttpTransport({
 *   triggerRequest: (triggerName, input, options) =>
 *     fetch('/api/octavus', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ sessionId, triggerName, input }),
 *       signal: options?.signal,
 *     }),
 * });
 * ```
 */
export function createHttpTransport(options: HttpTransportOptions): Transport {
  let abortController: AbortController | null = null;

  return {
    async *trigger(triggerName, input) {
      abortController = new AbortController();

      try {
        const response = await options.triggerRequest(triggerName, input, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => `Request failed: ${response.status}`);
          throw new Error(errorText);
        }

        if (!response.body) {
          throw new Error('Response body is empty');
        }

        for await (const event of parseSSEStream(response, abortController.signal)) {
          if (abortController.signal.aborted) {
            break;
          }
          yield event;
        }
      } catch (err) {
        // Handle abort errors gracefully - don't throw, just exit
        if (isAbortError(err)) {
          return;
        }
        throw err;
      }
    },

    stop() {
      abortController?.abort();
      abortController = null;
    },
  };
}
