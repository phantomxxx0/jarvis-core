/**
 * Represents the conclusive decision made by the Reasoner.
 */
export enum BrainDecisionType {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUIRE_HUMAN = 'REQUIRE_HUMAN',
  REQUIRE_INFO = 'REQUIRE_INFO',
  ABORT = 'ABORT',
}
