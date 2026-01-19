export { OctavusClient, type OctavusClientConfig } from '@/client.js';
export { AgentsApi } from '@/agents.js';
export {
  AgentSessionsApi,
  type SessionState,
  type UISessionState,
  type ExpiredSessionState,
  type RestoreSessionResult,
  type SessionStatus,
  type SessionAttachOptions,
} from '@/agent-sessions.js';
export {
  FilesApi,
  type FileUploadRequest,
  type FileUploadInfo,
  type UploadUrlsResponse,
  fileUploadRequestSchema,
  fileUploadInfoSchema,
  uploadUrlsResponseSchema,
} from '@/files.js';
export { AgentSession, toSSEStream, type SessionConfig, type TriggerOptions } from '@/session.js';
export { Resource } from '@/resource.js';
export { ApiError } from '@/api-error.js';

// Agent types and schemas (read-only - use @octavus/cli for agent management)
export type {
  AgentFormat,
  AgentSettings,
  AgentPrompt,
  Agent,
  AgentDefinition,
} from '@/agent-types.js';

export {
  agentFormatSchema,
  agentSchema,
  agentsResponseSchema,
  agentDefinitionSchema,
} from '@/agent-types.js';

// Re-export everything from core so consumers don't need to install @octavus/core separately
export * from '@octavus/core';
