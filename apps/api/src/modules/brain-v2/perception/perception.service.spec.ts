import { BadRequestException } from '@nestjs/common';
import { PerceptionService } from './perception.service';
import type { BrainInput } from '../contracts/brain-input';

describe('PerceptionService', () => {
  let service: PerceptionService;
  let validator: { validate: jest.Mock };
  let modalityDetector: { detect: jest.Mock };
  let normalizer: { normalize: jest.Mock };
  let parser: { parse: jest.Mock };
  let contextBuilder: { build: jest.Mock };

  const baseInput: BrainInput = {
    userId: 'user-1',
    sessionId: 'sess-1',
    timestamp: new Date(),
    modality: 'text',
    rawInput: '  what is my   favourite colour  ',
    metadata: {},
  };

  beforeEach(() => {
    validator = { validate: jest.fn().mockReturnValue({ valid: true }) };
    modalityDetector = { detect: jest.fn().mockReturnValue('text') };
    normalizer = {
      normalize: jest.fn().mockReturnValue({
        text: 'what is my favourite colour',
        wasTruncated: false,
        languageCode: 'en',
      }),
    };
    parser = {
      parse: jest.fn().mockReturnValue({ codeBlocks: [], attachmentRefs: [] }),
    };
    contextBuilder = {
      build: jest.fn().mockReturnValue({
        sessionId: 'sess-1',
        userId: 'user-1',
        normalizedInput: 'what is my favourite colour',
        modality: 'text',
        languageCode: 'en',
        estimatedTokens: 5,
        wasTruncated: false,
        codeBlocks: [],
        attachmentRefs: [],
        timestamp: baseInput.timestamp,
        perceivedAt: new Date(),
      }),
    };

    service = new PerceptionService(
      validator as any,
      modalityDetector,
      normalizer as any,
      parser as any,
      contextBuilder,
    );
  });

  it('orchestrates validate → detect → normalize → parse → build in order', async () => {
    const result = await service.perceive(baseInput);

    expect(validator.validate).toHaveBeenCalledWith(baseInput);
    expect(modalityDetector.detect).toHaveBeenCalledWith(baseInput);
    expect(normalizer.normalize).toHaveBeenCalledWith(baseInput.rawInput);
    expect(parser.parse).toHaveBeenCalledWith('what is my favourite colour');
    expect(contextBuilder.build).toHaveBeenCalledWith(
      baseInput,
      'what is my favourite colour',
      'text',
      [],
      [],
      'en',
      false,
    );
    expect(result.normalizedInput).toBe('what is my favourite colour');
  });

  it('throws BadRequestException when validation fails, and skips remaining steps', async () => {
    validator.validate.mockReturnValue({ valid: false, reason: 'empty input' });

    await expect(service.perceive(baseInput)).rejects.toThrow(
      BadRequestException,
    );
    expect(modalityDetector.detect).not.toHaveBeenCalled();
  });

  it('reports isReady as true', () => {
    expect(service.isReady()).toBe(true);
  });
});
