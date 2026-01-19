/**
 * Octavus skill tool names
 *
 * These are internal tools executed in E2B sandboxes.
 * Use these constants to filter skill tool events from external tool call events.
 */
export const OCTAVUS_SKILL_TOOLS = {
  SKILL_READ: 'octavus_skill_read',
  SKILL_LIST: 'octavus_skill_list',
  SKILL_RUN: 'octavus_skill_run',
  CODE_RUN: 'octavus_code_run',
  FILE_WRITE: 'octavus_file_write',
  FILE_READ: 'octavus_file_read',
} as const;

export type OctavusSkillToolName = (typeof OCTAVUS_SKILL_TOOLS)[keyof typeof OCTAVUS_SKILL_TOOLS];

/**
 * Check if a tool name is an Octavus skill tool
 *
 * @example
 * ```typescript
 * if (isOctavusSkillTool(event.toolName)) {
 *   // This is a skill tool, executed in E2B sandbox
 *   const skillSlug = event.input?.skill;
 * } else {
 *   // This is an external tool, executed on consumer's server
 * }
 * ```
 */
export function isOctavusSkillTool(toolName: string): toolName is OctavusSkillToolName {
  return Object.values(OCTAVUS_SKILL_TOOLS).includes(toolName as OctavusSkillToolName);
}

/**
 * Extract skill slug from skill tool arguments
 *
 * Most skill tools include a `skill` parameter with the skill slug.
 * Returns undefined if the tool is not a skill tool or if the skill slug is not present.
 *
 * @example
 * ```typescript
 * const slug = getSkillSlugFromToolCall(event.toolName, event.input);
 * if (slug) {
 *   console.log(`Using skill: ${slug}`);
 * }
 * ```
 */
export function getSkillSlugFromToolCall(
  toolName: string,
  args: Record<string, unknown> | undefined,
): string | undefined {
  if (!isOctavusSkillTool(toolName) || !args) {
    return undefined;
  }

  // Most skill tools have a 'skill' parameter
  if (typeof args.skill === 'string') {
    return args.skill;
  }

  return undefined;
}
