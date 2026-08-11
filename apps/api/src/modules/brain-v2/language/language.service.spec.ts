/// <reference types="jest" />

import { LanguageGenerator } from './language.service';
import type { CognitiveContext } from '../contracts/cognitive-context';
import type { WorkingMemoryState } from '../contracts/working-memory';
import type { InferenceResponse } from '../../workers/inference/contracts/inference-response';

function makeContext(): Partial<CognitiveContext> {
  return {
    perceptionResult: {
      normalizedInput: 'hello there',
      sessionId: 'sess',
      userId: 'user',
      modality: 'text',
      languageCode: 'en',
      estimatedTokens: 3,
      wasTruncated: false,
      codeBlocks: [],
      attachmentRefs: [],
      timestamp: new Date(),
      perceivedAt: new Date(),
    } as any,
    memoryContext: '',
  };
}

function makeState(): Partial<WorkingMemoryState> {
  return {
    userId: 'user',
    conversationHistory: [],
    userIdentity: { name: 'Alex', facts: {} },
    toolOutputs: {},
    retrievedFacts: [],
  };
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of gen) {
    out.push(item);
  }
  return out;
}

function makeResponse(content?: string): InferenceResponse {
  return {
    success: true,
    content,
    generatedAt: new Date(),
  };
}

describe('LanguageGenerator.generateStream', () => {
  let promptBuilder: { buildSystemPrompt: jest.Mock; buildUserPrompt: jest.Mock };
  let inference: { infer: jest.Mock; inferStream: jest.Mock };
  let generator: LanguageGenerator;

  beforeEach(() => {
    promptBuilder = {
      buildSystemPrompt: jest.fn().mockReturnValue('SYSTEM_PROMPT'),
      buildUserPrompt: jest.fn().mockReturnValue('USER_PROMPT'),
    };
    inference = {
      infer: jest.fn(),
      inferStream: jest.fn(),
    };
    generator = new LanguageGenerator(promptBuilder as any, inference as any);
  });

  it('builds the prompt using buildSystemPrompt and buildUserPrompt', async () => {
    inference.inferStream.mockImplementation(async function* () {
      yield makeResponse('hi');
    });

    const context = makeContext();
    const state = makeState();

    await collect(
      generator.generateStream(
        context as CognitiveContext,
        state as WorkingMemoryState,
      ),
    );

    expect(promptBuilder.buildSystemPrompt).toHaveBeenCalledWith(context, state);
    expect(promptBuilder.buildUserPrompt).toHaveBeenCalledWith(context, state);
  });

  it('calls inferStream exactly once with the same request shape as generate()', async () => {
    inference.inferStream.mockImplementation(async function* () {
      yield makeResponse('hi');
    });

    await collect(
      generator.generateStream(
        makeContext() as CognitiveContext,
        makeState() as WorkingMemoryState,
      ),
    );

    expect(inference.inferStream).toHaveBeenCalledTimes(1);

    const [providerType, request] = inference.inferStream.mock.calls[0];
    expect(providerType).toBe('OLLAMA');
    expect(request).toMatchObject({
      modelId: 'llama3.1:8b',
      systemPrompt: 'SYSTEM_PROMPT',
      temperature: 0.7,
      maxTokens: 4000,
      keepAlive: -1,
    });
    expect(request.messages[request.messages.length - 1]).toEqual({
      role: 'user',
      content: 'USER_PROMPT',
    });
  });

  it('yields one string per non-empty inference chunk', async () => {
    inference.inferStream.mockImplementation(async function* () {
      yield makeResponse('Hello');
      yield makeResponse(' world');
      yield makeResponse('!');
    });

    const results = await collect(
      generator.generateStream(
        makeContext() as CognitiveContext,
        makeState() as WorkingMemoryState,
      ),
    );

    expect(results).toEqual(['Hello', ' world', '!']);
  });

  it('ignores chunks with empty or missing content', async () => {
    inference.inferStream.mockImplementation(async function* () {
      yield makeResponse('Hello');
      yield makeResponse(''); // empty string
      yield makeResponse(undefined); // missing content
      yield makeResponse(' world');
    });

    const results = await collect(
      generator.generateStream(
        makeContext() as CognitiveContext,
        makeState() as WorkingMemoryState,
      ),
    );

    expect(results).toEqual(['Hello', ' world']);
  });

  it('propagates errors thrown mid-stream to the caller', async () => {
    inference.inferStream.mockImplementation(async function* () {
      yield makeResponse('Hello');
      throw new Error('simulated stream failure');
    });

    const gen = generator.generateStream(
      makeContext() as CognitiveContext,
      makeState() as WorkingMemoryState,
    );

    await expect(collect(gen)).rejects.toThrow('simulated stream failure');
  });

  it('reuses the same conversation history truncation as generate()', async () => {
    inference.inferStream.mockImplementation(async function* () {
      yield makeResponse('ok');
    });

    const longHistory = Array.from({ length: 10 }, (_, i) => ({
      role: 'user' as const,
      content: `msg-${i}`,
      timestamp: new Date(),
    }));

    const state = { ...makeState(), conversationHistory: longHistory };

    await collect(
      generator.generateStream(
        makeContext() as CognitiveContext,
        state as WorkingMemoryState,
      ),
    );

    const [, request] = inference.inferStream.mock.calls[0];
    // MAX_HISTORY_TURNS = 5, plus the final user prompt message = 6 total
    expect(request.messages.length).toBe(6);
    expect(request.messages[0].content).toBe('msg-5');
  });
});
