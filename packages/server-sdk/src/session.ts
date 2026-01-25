import {
  safeParseStreamEvent,
  isAbortError,
  createInternalErrorEvent,
  createApiErrorEvent,
  type StreamEvent,
  type ToolHandlers,
  type PendingToolCall,
  type ToolResult,
} from '@octavus/core';
import { parseApiError } from '@/api-error.js';
import type { ApiClientConfig } from '@/base-api-client.js';
import type { Resource } from '@/resource.js';

/**
 * Converts an async iterable of stream events to an SSE-formatted ReadableStream.
 * Use this when you need to return an SSE response (e.g., HTTP endpoints).
 *
 * @example
 * ```typescript
 * const events = session.trigger('user-message', input);
 * return new Response(toSSEStream(events), {
 *   headers: { 'Content-Type': 'text/event-stream' },
 * });
 * ```
 */
export function toSSEStream(events: AsyncIterable<StreamEvent>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        const errorEvent = createInternalErrorEvent(
          err instanceof Error ? err.message : 'Unknown error',
        );
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        controller.close();
      }
    },
  });
}

export interface SessionConfig {
  sessionId: string;
  config: ApiClientConfig;
  tools?: ToolHandlers;
  resources?: Resource[];
}

/**
 * Options for trigger execution.
 */
export interface TriggerOptions {
  /** Abort signal to cancel the trigger execution */
  signal?: AbortSignal;
  /** Results from client-side tool execution (for continuation) */
  clientToolResults?: ToolResult[];
}

/** Handles streaming and tool continuation for agent sessions */
export class AgentSession {
  private sessionId: string;
  private config: ApiClientConfig;
  private toolHandlers: ToolHandlers;
  private resourceMap: Map<string, Resource>;

  constructor(sessionConfig: SessionConfig) {
    this.sessionId = sessionConfig.sessionId;
    this.config = sessionConfig.config;
    this.toolHandlers = sessionConfig.tools ?? {};
    this.resourceMap = new Map();

    // Index resources by name for fast lookup
    for (const resource of sessionConfig.resources ?? []) {
      this.resourceMap.set(resource.name, resource);
    }
  }

  /**
   * Trigger an agent action and stream the response as parsed events.
   *
   * This method:
   * 1. POSTs to the platform trigger endpoint
   * 2. Yields parsed stream events to the consumer
   * 3. When tool-request event is received:
   *    - Server tools (with handlers) are executed locally
   *    - Client tools (without handlers) are forwarded via client-tool-request
   * 4. If all tools have server handlers: POSTs a new request with toolResults to continue
   * 5. If any tools need client handling: yields client-tool-request and waits for clientToolResults
   * 6. Repeats until done (no more tool requests)
   *
   * @param triggerName - The trigger name defined in the agent's protocol
   * @param triggerInput - Input parameters for the trigger
   * @param options - Optional configuration including abort signal and client tool results
   *
   * @example
   * ```typescript
   * // For sockets: iterate events directly
   * for await (const event of session.trigger('user-message', input)) {
   *   conn.write(JSON.stringify(event));
   * }
   *
   * // For HTTP: convert to SSE stream with abort support
   * const events = session.trigger('user-message', input, { signal: request.signal });
   * return new Response(toSSEStream(events), {
   *   headers: { 'Content-Type': 'text/event-stream' },
   * });
   *
   * // Continue with client tool results
   * const events = session.trigger('user-message', input, {
   *   clientToolResults: [{ toolCallId: '...', result: { rating: 5 } }],
   * });
   * ```
   */
  async *trigger(
    triggerName: string,
    triggerInput?: Record<string, unknown>,
    options?: TriggerOptions,
  ): AsyncGenerator<StreamEvent> {
    let toolResults: ToolResult[] | undefined;
    let continueLoop = true;

    // If client tool results are provided, use them as initial tool results
    if (options?.clientToolResults && options.clientToolResults.length > 0) {
      toolResults = options.clientToolResults;
    }

    while (continueLoop) {
      // Check if aborted before making request
      if (options?.signal?.aborted) {
        yield { type: 'finish', finishReason: 'stop' };
        return;
      }

      // Make request to platform (with toolResults on continuation)
      let response: Response;
      try {
        response = await fetch(
          `${this.config.baseUrl}/api/agent-sessions/${this.sessionId}/trigger`,
          {
            method: 'POST',
            headers: this.config.getHeaders(),
            body: JSON.stringify({
              triggerName,
              input: triggerInput,
              toolResults,
            }),
            signal: options?.signal,
          },
        );
      } catch (err) {
        // Handle abort errors gracefully
        if (isAbortError(err)) {
          yield { type: 'finish', finishReason: 'stop' };
          return;
        }
        throw err;
      }

      if (!response.ok) {
        const { message } = await parseApiError(response, 'Failed to trigger');
        yield createApiErrorEvent(response.status, message);
        return;
      }

      if (!response.body) {
        yield createInternalErrorEvent('Response body is not readable');
        return;
      }

      // Reset tool results for next iteration
      toolResults = undefined;

      // Read and process the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let pendingToolCalls: PendingToolCall[] | null = null;

      // Read stream until done
      let streamDone = false;
      while (!streamDone) {
        // Check if aborted during stream reading
        if (options?.signal?.aborted) {
          reader.releaseLock();
          yield { type: 'finish', finishReason: 'stop' };
          return;
        }

        let readResult: ReadableStreamReadResult<Uint8Array>;
        try {
          readResult = await reader.read();
        } catch (err) {
          // Handle abort errors gracefully during read
          if (isAbortError(err)) {
            reader.releaseLock();
            yield { type: 'finish', finishReason: 'stop' };
            return;
          }
          throw err;
        }

        const { done, value } = readResult;

        if (done) {
          streamDone = true;
          continue;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = safeParseStreamEvent(JSON.parse(line.slice(6)));
              if (!parsed.success) {
                // Skip malformed events
                continue;
              }
              const event = parsed.data;

              // Handle tool-request - split into server and client tools
              if (event.type === 'tool-request') {
                pendingToolCalls = event.toolCalls;
                // Don't forward tool-request to consumer
                continue;
              }

              if (event.type === 'finish') {
                if (event.finishReason === 'tool-calls' && pendingToolCalls) {
                  continue;
                }
                yield event;
                continueLoop = false;
                continue;
              }

              // Handle resource updates
              if (event.type === 'resource-update') {
                this.handleResourceUpdate(event.name, event.value);
              }

              // Yield all other events to the consumer
              yield event;
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      // Check if aborted before tool execution
      if (options?.signal?.aborted) {
        yield { type: 'finish', finishReason: 'stop' };
        return;
      }

      // If we have pending tool calls, split into server and client tools
      if (pendingToolCalls && pendingToolCalls.length > 0) {
        // Split tools by handler presence
        const serverTools = pendingToolCalls.filter((tc) => this.toolHandlers[tc.toolName]);
        const clientTools = pendingToolCalls.filter((tc) => !this.toolHandlers[tc.toolName]);

        // Execute server tools
        const serverResults = await Promise.all(
          serverTools.map(async (tc): Promise<ToolResult> => {
            // Handler is guaranteed to exist since we filtered by handler presence
            const handler = this.toolHandlers[tc.toolName]!;
            try {
              const result = await handler(tc.args);
              return {
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                result,
                outputVariable: tc.outputVariable,
                blockIndex: tc.blockIndex,
              };
            } catch (err) {
              return {
                toolCallId: tc.toolCallId,
                toolName: tc.toolName,
                error: err instanceof Error ? err.message : 'Tool execution failed',
                outputVariable: tc.outputVariable,
                blockIndex: tc.blockIndex,
              };
            }
          }),
        );

        // Emit tool-output events for server tools immediately
        for (const tr of serverResults) {
          if (tr.error) {
            yield { type: 'tool-output-error', toolCallId: tr.toolCallId, error: tr.error };
          } else {
            yield { type: 'tool-output-available', toolCallId: tr.toolCallId, output: tr.result };
          }
        }

        // If there are client tools, emit client-tool-request and stop the loop
        if (clientTools.length > 0) {
          yield { type: 'client-tool-request', toolCalls: clientTools };
          yield { type: 'finish', finishReason: 'client-tool-calls' };
          continueLoop = false;
        } else {
          // All tools handled server-side, continue loop
          toolResults = serverResults;
        }
      } else {
        // No pending tools, we're done
        continueLoop = false;
      }
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  private handleResourceUpdate(name: string, value: unknown): void {
    const resource = this.resourceMap.get(name);
    if (resource) {
      void resource.onUpdate(value);
    }
  }
}
