import type { StreamEvent, ToolResult } from '@octavus/core';

// =============================================================================
// Base Transport Interface
// =============================================================================

/**
 * Options for triggering the agent.
 */
export interface TriggerOptions {
  /** Results from client-side tool execution (for continuation) */
  clientToolResults?: ToolResult[];
}

/**
 * Transport interface for delivering events from server to client.
 *
 * Abstracts the connection mechanism (HTTP/SSE or WebSocket) behind a unified
 * async iterator interface. Use `createHttpTransport` or `createSocketTransport`
 * to create an implementation.
 */
export interface Transport {
  /**
   * Trigger the agent and stream events.
   * @param triggerName - The trigger name defined in the agent's protocol
   * @param input - Input parameters for variable substitution
   * @param options - Optional trigger options including client tool results
   */
  trigger(
    triggerName: string,
    input?: Record<string, unknown>,
    options?: TriggerOptions,
  ): AsyncIterable<StreamEvent>;

  /** Stop the current stream. Safe to call when no stream is active. */
  stop(): void;
}

// =============================================================================
// Socket Transport (extends Transport with connection management)
// =============================================================================

/**
 * Connection states for socket transport.
 *
 * - `disconnected`: Not connected (initial state or after disconnect)
 * - `connecting`: Connection attempt in progress
 * - `connected`: Successfully connected and ready
 * - `error`: Connection failed (check error in listener callback)
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Callback for connection state changes.
 */
export type ConnectionStateListener = (state: ConnectionState, error?: Error) => void;

/**
 * Socket transport with connection management capabilities.
 *
 * Extends the base Transport interface with methods for managing persistent
 * WebSocket/SockJS connections. Use this when you need:
 * - Eager connection (connect before first message)
 * - Connection status UI indicators
 * - Manual connection lifecycle control
 *
 * Created via `createSocketTransport()`.
 */
export interface SocketTransport extends Transport {
  /**
   * Current connection state.
   *
   * - `disconnected`: Not connected (initial state)
   * - `connecting`: Connection in progress
   * - `connected`: Ready to send/receive
   * - `error`: Connection failed
   */
  readonly connectionState: ConnectionState;

  /**
   * Subscribe to connection state changes.
   *
   * The listener is called immediately with the current state, then again
   * whenever the state changes.
   *
   * @param listener - Callback invoked on state changes
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = transport.onConnectionStateChange((state, error) => {
   *   setConnectionState(state);
   *   if (error) setConnectionError(error);
   * });
   * ```
   */
  onConnectionStateChange(listener: ConnectionStateListener): () => void;

  /**
   * Eagerly establish the connection.
   *
   * By default, socket transport connects lazily on first `trigger()`. Call
   * this method to establish the connection early (e.g., on component mount):
   * - Faster first message response
   * - Show accurate connection status in UI
   * - Handle connection errors before user interaction
   *
   * Safe to call multiple times - resolves immediately if already connected.
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   transport.connect()
   *     .then(() => console.log('Connected'))
   *     .catch((err) => console.error('Failed:', err));
   *
   *   return () => transport.disconnect();
   * }, [transport]);
   * ```
   */
  connect(): Promise<void>;

  /**
   * Close the connection and clean up resources.
   *
   * The transport will reconnect automatically on next `trigger()` call.
   */
  disconnect(): void;

  /**
   * Send client tool results directly over the socket.
   * For WebSocket transport, this continues execution without a new trigger call.
   *
   * @param results - Array of tool results to send
   */
  sendClientToolResults(results: ToolResult[]): void;

  /**
   * Returns an async iterable for continuation events after sendClientToolResults.
   * Call this after sendClientToolResults to consume the server's response.
   */
  continuationEvents(): AsyncIterable<StreamEvent>;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a transport is a SocketTransport with connection management.
 *
 * @example
 * ```typescript
 * if (isSocketTransport(transport)) {
 *   transport.connect(); // TypeScript knows this is available
 * }
 * ```
 */
export function isSocketTransport(transport: Transport): transport is SocketTransport {
  return (
    'connect' in transport &&
    'disconnect' in transport &&
    'connectionState' in transport &&
    'onConnectionStateChange' in transport &&
    'sendClientToolResults' in transport
  );
}
