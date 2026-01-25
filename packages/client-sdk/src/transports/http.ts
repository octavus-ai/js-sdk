import { isAbortError, type ToolResult } from '@octavus/core';
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
   * Called for both initial triggers and continuations.
   *
   * @param params - Request parameters
   * @param params.triggerName - The trigger name (for new triggers)
   * @param params.input - Input parameters (for new triggers)
   * @param params.executionId - Execution ID (for continuation)
   * @param params.clientToolResults - Tool results (for continuation)
   * @param options - Request options including abort signal
   * @returns Response with SSE stream body
   *
   * @example
   * ```typescript
   * triggerRequest: (params, options) =>
   *   fetch('/api/trigger', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify({ sessionId, ...params }),
   *     signal: options?.signal,
   *   }),
   * ```
   */
  triggerRequest: (
    params: {
      triggerName?: string;
      input?: Record<string, unknown>;
      executionId?: string;
      clientToolResults?: ToolResult[];
    },
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
 *   triggerRequest: (params, options) =>
 *     fetch('/api/trigger', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ sessionId, ...params }),
 *       signal: options?.signal,
 *     }),
 * });
 * ```
 */
export function createHttpTransport(options: HttpTransportOptions): Transport {
  let abortController: AbortController | null = null;

  async function* makeRequest(params: {
    triggerName?: string;
    input?: Record<string, unknown>;
    executionId?: string;
    clientToolResults?: ToolResult[];
  }) {
    abortController = new AbortController();

    try {
      const response = await options.triggerRequest(params, {
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
  }

  return {
    async *trigger(triggerName, input) {
      yield* makeRequest({ triggerName, input });
    },

    async *continueWithToolResults(executionId, results) {
      yield* makeRequest({ executionId, clientToolResults: results });
    },

    stop() {
      abortController?.abort();
      abortController = null;
    },
  };
}
