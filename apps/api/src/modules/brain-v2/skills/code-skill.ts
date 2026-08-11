import type { ISkill, SkillResult } from './skill-router';

/**
 * CodeSkill (Stub)
 *
 * Phase 1: Interface stub. Phase 2: Wired to execution sandbox.
 * Executes code snippets in a sandboxed environment.
 */
export class CodeSkill implements ISkill {
  readonly skillName = 'code';
  readonly description = 'Execute code in a sandboxed environment';

  isAvailable(): boolean {
    return false;
  } // Phase 2

  async execute(input: Record<string, unknown>): Promise<unknown> {
    return { error: 'CodeSkill not yet implemented in Phase 1.', input };
  }
}

/**
 * BrowserSkill (Stub)
 *
 * Phase 1: Interface stub. Phase 2: Wired to a headless browser.
 * Browses URLs, extracts content, and screenshots.
 */
export class BrowserSkill implements ISkill {
  readonly skillName = 'browser';
  readonly description = 'Browse URLs and extract web content';

  isAvailable(): boolean {
    return false;
  }

  async execute(input: Record<string, unknown>): Promise<unknown> {
    return { error: 'BrowserSkill not yet implemented in Phase 1.', input };
  }
}

/**
 * ShellSkill (Stub)
 *
 * Phase 1: Interface stub. Phase 2: Wired to controlled shell execution.
 * Executes shell commands in a controlled environment.
 */
export class ShellSkill implements ISkill {
  readonly skillName = 'shell';
  readonly description = 'Execute shell commands in a controlled environment';

  isAvailable(): boolean {
    return false;
  }

  async execute(input: Record<string, unknown>): Promise<unknown> {
    return { error: 'ShellSkill not yet implemented in Phase 1.', input };
  }
}

/**
 * SearchSkill (Stub)
 *
 * Phase 1: Interface stub. Phase 2: Wired to web search API.
 * Performs web searches and returns structured results.
 */
export class SearchSkill implements ISkill {
  readonly skillName = 'search';
  readonly description = 'Perform web searches and return structured results';

  isAvailable(): boolean {
    return false;
  }

  async execute(input: Record<string, unknown>): Promise<unknown> {
    return { error: 'SearchSkill not yet implemented in Phase 1.', input };
  }
}

/**
 * VisionSkill (Stub)
 *
 * Phase 1: Interface stub. Phase 3: Wired to vision model.
 * Analyzes images, screenshots, and visual input.
 */
export class VisionSkill implements ISkill {
  readonly skillName = 'vision';
  readonly description = 'Analyze images and visual input';

  isAvailable(): boolean {
    return false;
  }

  async execute(input: Record<string, unknown>): Promise<unknown> {
    return { error: 'VisionSkill not yet implemented in Phase 1.', input };
  }
}
