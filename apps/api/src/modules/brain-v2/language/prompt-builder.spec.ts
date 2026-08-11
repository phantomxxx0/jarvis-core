/// <reference types="jest" />

import { PromptBuilder } from './prompt-builder';
import type { CognitiveContext } from '../contracts/cognitive-context';
import type { WorkingMemoryState } from '../contracts/working-memory';

describe('PromptBuilder', () => {
  it('includes retrieved memory sections and the user input in the final prompt', () => {
    const personality = {
      assembleProfile: jest.fn().mockReturnValue({
        identityDirective: 'You are helpful.',
        behaviorDirective: '',
        empathyDirective: '',
        humorDirective: '',
        constraints: [],
      }),
    } as any;

    const contextWindow = {
      fitMemoryContext: jest.fn((text: string) => text),
      fitReasoningContext: jest.fn((text: string) => text),
    } as any;

    const builder = new PromptBuilder(personality, contextWindow);

    const context: Partial<CognitiveContext> = {
      perceptionResult: {
        normalizedInput: 'what is my favourite colour',
        sessionId: 'sess',
        userId: 'user',
        modality: 'text',
        languageCode: 'en',
        estimatedTokens: 5,
        wasTruncated: false,
        codeBlocks: [],
        attachmentRefs: [],
        timestamp: new Date(),
        perceivedAt: new Date(),
      },
      memoryContext: 'User favourite colour is purple.',
    } as any;

    const state: Partial<WorkingMemoryState> = {
      userIdentity: { name: 'Alex', facts: {} },
      toolOutputs: {},
      retrievedFacts: ['User favourite colour is purple.'],
    };

    const prompt = builder.buildUserPrompt(
      context as CognitiveContext,
      state as WorkingMemoryState,
    );

    expect(prompt).toContain('--- Retrieved Memory ---');
    expect(prompt).toContain('User favourite colour is purple.');
    expect(prompt).toContain('--- User Input ---');
    expect(prompt).toContain('what is my favourite colour');
  });
});
