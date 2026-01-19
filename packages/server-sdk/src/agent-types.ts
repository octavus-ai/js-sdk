import { z } from 'zod';

/** Agent format - interactive (chat) or worker (background task) */
export type AgentFormat = 'interactive' | 'worker';

/** Agent settings */
export interface AgentSettings {
  slug: string;
  name: string;
  description?: string;
  format: AgentFormat;
}

/** Agent prompt */
export interface AgentPrompt {
  name: string;
  content: string;
}

/**
 * Agent summary returned from list endpoint
 */
export interface Agent {
  /** Agent slug (human-readable identifier within project) */
  slug: string;
  /** Agent ID - use this for API calls */
  id: string;
  name: string;
  description: string | null;
  format: AgentFormat;
  createdAt: string;
  updatedAt: string;
  projectId: string;
}

/**
 * Full agent definition returned from get endpoint
 */
export interface AgentDefinition {
  settings: AgentSettings;
  protocol: string;
  prompts: AgentPrompt[];
  /** Agent ID - use this for API calls like createSession */
  id: string;
}

// Schemas

export const agentFormatSchema = z.enum(['interactive', 'worker']);

const agentSettingsSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  format: agentFormatSchema,
});

const agentPromptSchema = z.object({
  name: z.string(),
  content: z.string(),
});

export const agentSchema = z.object({
  slug: z.string(),
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  format: agentFormatSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  projectId: z.string(),
});

export const agentsResponseSchema = z.object({
  agents: z.array(agentSchema),
});

export const agentDefinitionSchema = z.object({
  settings: agentSettingsSchema,
  protocol: z.string(),
  prompts: z.array(agentPromptSchema),
  id: z.string(),
});
