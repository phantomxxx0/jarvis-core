import { Injectable } from '@nestjs/common';
import type { CognitiveContext } from '../contracts/cognitive-context';
import { JARVIS_PERSONALITY } from './traits';
import { BehaviorEngine } from './behavior';
import { EmpathyEngine } from './empathy';
import { HumorEngine } from './humor';

/**
 * PersonalityProfile
 *
 * Assembled personality context passed to the Language Generator.
 */
export interface PersonalityProfile {
  /** Core identity and trait instructions. */
  identityDirective: string;

  /** Behavioral modifier instructions. */
  behaviorDirective: string;

  /** Empathy instructions (may be empty if not needed). */
  empathyDirective: string;

  /** Humor instructions (may be empty if humor not appropriate). */
  humorDirective: string;

  /** Hard constraints to inject. */
  constraints: string[];
}

/**
 * PersonalityService
 *
 * Assembles a complete PersonalityProfile for a given cognitive context.
 * The Language Generator's PromptBuilder calls this once per turn to
 * inject Jarvis's character into the system prompt.
 */
@Injectable()
export class PersonalityService {
  readonly moduleName = 'Personality';

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Assembles a PersonalityProfile from the cognitive context.
   *
   * @param context - The assembled CognitiveContext for this turn.
   * @returns A PersonalityProfile for prompt injection.
   */
  assembleProfile(context: CognitiveContext): PersonalityProfile {
    const { attentionResult } = context;
    const isDistressed = attentionResult.emotion === 'DISTRESSED';
    const isGreeting = attentionResult.intent === 'GREETING';

    // Identity directive
    const identityDirective = [
      `You are ${JARVIS_PERSONALITY.name}, ${JARVIS_PERSONALITY.role}.`,
      `Your core traits: ${JARVIS_PERSONALITY.traits.join(', ')}.`,
      `Communication style: ${JARVIS_PERSONALITY.communicationStyle.join('. ')}.`,
    ].join('\n');

    // Behavior directive
    const behaviorMod = BehaviorEngine.getModifier(
      attentionResult.intent,
      attentionResult.emotion,
    );
    const behaviorDirective = [
      behaviorMod.includeCodeExamples
        ? 'Include code examples where helpful.'
        : '',
      behaviorMod.suggestNextSteps
        ? 'Proactively suggest logical next steps.'
        : '',
      behaviorMod.preferBrief ? 'Keep your response concise.' : '',
      behaviorMod.formatHint === 'markdown'
        ? 'Format with Markdown where appropriate.'
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    // Empathy directive
    let empathyDirective = '';
    if (isDistressed) {
      empathyDirective = EmpathyEngine.getCrisisDirective().instruction;
    } else if (
      attentionResult.emotion === 'NEGATIVE' ||
      attentionResult.emotion === 'FRUSTRATED'
    ) {
      empathyDirective = EmpathyEngine.getNegativeStateDirective().instruction;
    }

    // Humor directive
    const humor = HumorEngine.getProfile(isDistressed, isGreeting);
    const humorDirective = humor.directive;

    return {
      identityDirective,
      behaviorDirective,
      empathyDirective,
      humorDirective,
      constraints: JARVIS_PERSONALITY.hardConstraints,
    };
  }
}
