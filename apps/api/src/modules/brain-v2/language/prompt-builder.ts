import { Injectable, Logger } from '@nestjs/common';
import type { CognitiveContext } from '../contracts/cognitive-context';
import type { WorkingMemoryState } from '../contracts/working-memory';
import { PersonalityService } from '../personality/personality.service';
import { ContextWindowManager } from '../working-memory/context-window';

@Injectable()
export class PromptBuilder {
  private readonly logger = new Logger(PromptBuilder.name);

  constructor(
    private readonly personality: PersonalityService,
    private readonly contextWindow: ContextWindowManager,
  ) {}

  buildSystemPrompt(
    context: CognitiveContext,
    state: WorkingMemoryState,
  ): string {
    const profile = this.personality.assembleProfile(context);

    const parts: string[] = [
      profile.identityDirective,
      profile.behaviorDirective,
      profile.empathyDirective,
      profile.humorDirective,
    ];

    // Inject the user's name as a system-level constraint
    if (state.userIdentity?.name) {
      parts.push('--- Context ---');
      parts.push(
        `You are speaking with ${state.userIdentity.name}. Always refer to them by this name if asked.`,
      );
    }

    // Standing instructions: preferences the user has explicitly stated
    // and expects to be followed consistently in every response — not
    // merely recalled when asked. Loaded unconditionally in BrainV2Service,
    // independent of per-turn memory retrieval gating, so these survive
    // fast paths (short replies, trivial-importance turns, etc.).
    if (state.userIdentity?.preferredAddress) {
      parts.push('--- Standing Instructions ---');
      parts.push(
        `The user has instructed you to address them as "${state.userIdentity.preferredAddress}". ` +
          `Use this form of address in every response, including brief or casual replies, ` +
          `unless the user explicitly asks you to change it. This takes priority over their given name.`,
      );
    }

    parts.push('--- constraints ---');
    parts.push(...profile.constraints.map((c) => `- ${c}`));

    return parts.filter((p) => p.trim().length > 0).join('\n\n');
  }

  buildUserPrompt(
    context: CognitiveContext,
    state: WorkingMemoryState,
  ): string {
    const { perceptionResult, reasoningResult, memoryContext } = context;
    const parts: string[] = [];

    if (memoryContext && memoryContext.trim().length > 0) {
      parts.push('--- Retrieved Memory ---');
      parts.push(this.contextWindow.fitMemoryContext(memoryContext));
    }

    const toolOutputs = Object.entries(state.toolOutputs);
    if (toolOutputs.length > 0) {
      parts.push('--- Tool Outputs ---');
      for (const [skill, output] of toolOutputs) {
        parts.push(`[Skill: ${skill}]\n${JSON.stringify(output, null, 2)}`);
      }
    }

    if (reasoningResult) {
      parts.push('--- Internal Reasoning ---');
      const reasoningText = [
        `Intent: ${reasoningResult.intent}`,
        `Strategy: ${reasoningResult.executionStrategy}`,
        reasoningResult.identifiedConstraints.length > 0
          ? `Constraints: ${reasoningResult.identifiedConstraints.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
      parts.push(this.contextWindow.fitReasoningContext(reasoningText));
    }

    parts.push('--- User Input ---');
    parts.push(perceptionResult.normalizedInput);

    this.logger.debug(
      `[PromptBuilder] Sections=${parts
        .filter((part) => part.startsWith('---'))
        .join(', ')}`,
    );

    return parts.join('\n\n');
  }
}
