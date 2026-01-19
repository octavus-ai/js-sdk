import { BaseApiClient } from '@/base-api-client.js';
import {
  agentsResponseSchema,
  agentDefinitionSchema,
  type Agent,
  type AgentDefinition,
} from '@/agent-types.js';

/**
 * API for listing and retrieving agent definitions.
 *
 * Note: Agent management (create, update, sync) should be done via the @octavus/cli package.
 * This API uses agent IDs only - use CLI for slug-based operations.
 */
export class AgentsApi extends BaseApiClient {
  /** List all agents in the project */
  async list(): Promise<Agent[]> {
    const response = await this.httpGet('/api/agents', agentsResponseSchema);
    return response.agents;
  }

  /** Get a single agent by ID */
  async get(agentId: string): Promise<AgentDefinition> {
    return await this.httpGet(`/api/agents/${agentId}`, agentDefinitionSchema);
  }
}
