export {
  OctavusChat,
  type OctavusChatOptions,
  type ChatStatus,
  type UserMessageInput,
} from './chat';

export { uploadFiles, type UploadFilesOptions, type UploadUrlsResponse } from './files';

export { parseSSEStream } from './stream/reader';

// Transport exports
export {
  createHttpTransport,
  createSocketTransport,
  isSocketTransport,
  type Transport,
  type SocketTransport,
  type ConnectionState,
  type ConnectionStateListener,
  type HttpTransportOptions,
  type TriggerRequestOptions,
  type SocketLike,
  type SocketTransportOptions,
} from './transports';

// Re-export everything from core so consumers don't need to install @octavus/core separately
export * from '@octavus/core';
