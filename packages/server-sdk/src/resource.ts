/**
 * Base class for agent-managed resources.
 * Extend this class to define how each resource should be persisted when the agent updates it.
 */
export abstract class Resource {
  /** The resource name as defined in the agent protocol */
  abstract readonly name: string;

  /** Called when the agent updates this resource */
  abstract onUpdate(value: unknown): Promise<void> | void;
}
