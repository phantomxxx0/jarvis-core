/**
 * ISkill
 *
 * The base interface that all Brain V2 skills implement.
 * Skills are pluggable cognitive capabilities (code, search, shell, vision, etc.)
 * invoked by the SkillRouter when the Executive decides useTool=true.
 *
 * Designed for 10-year extensibility:
 *   Phase 1: Code, Shell, Search (text)
 *   Phase 2: Browser, Vision
 *   Phase 3: Robotics, IoT
 *   Phase 4: Multi-agent delegation
 */
export interface ISkill {
  /** Unique skill identifier. */
  readonly skillName: string;

  /** Human-readable description of what this skill does. */
  readonly description: string;

  /** Returns true if the skill is available and healthy. */
  isAvailable(): boolean;

  /**
   * Executes the skill with the given input.
   *
   * @param input - Skill-specific input payload.
   * @returns Skill-specific output.
   */
  execute(input: Record<string, unknown>): Promise<unknown>;
}

/**
 * SkillResult
 *
 * Standard result wrapper for all skill invocations.
 */
export interface SkillResult {
  skillName: string;
  success: boolean;
  output: unknown;
  error?: string;
  executionMs: number;
}
