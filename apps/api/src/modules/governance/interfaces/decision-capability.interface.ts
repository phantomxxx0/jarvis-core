/**
 * DecisionCapabilities
 *
 * A cognitive-module-agnostic set of capability flags that may require
 * authorization. Executive (or any other cognitive module) declares what
 * it intends to do in these terms — never in terms of Permission enum
 * values — and hands them to AuthorizationService.evaluateDecision().
 *
 * Extend this interface, and PermissionMapper's table, when a new
 * capability needs gating. Cognitive modules never need to know which
 * Permission a capability maps to.
 */
export interface DecisionCapabilities {
  useTool?: boolean;
}

export type DecisionCapabilityKey = keyof DecisionCapabilities;

/** A single denied capability, with enough detail to log, audit, or
 * surface a user-facing message — without knowing about Permission. */
export interface GovernanceDenial {
  capability: DecisionCapabilityKey;
  reason: string;
}

/**
 * Result of evaluating requested capabilities against an ExecutionContext.
 * `capabilities` mirrors the request shape, narrowed to what's allowed —
 * never widened beyond what was requested.
 */
export interface GovernanceDecisionResult {
  capabilities: DecisionCapabilities;
  denials: GovernanceDenial[];
}
