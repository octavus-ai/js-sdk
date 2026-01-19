export {
  useOctavusChat,
  type UseOctavusChatReturn,
  type OctavusChatOptions,
  type ChatStatus,
  type UserMessageInput,
} from './hooks/use-octavus-chat';

// Re-export everything from client-sdk so consumers only need @octavus/react
export * from '@octavus/client-sdk';
