/// <reference types="jest" />

import { IntentDetector } from './intent-detector';
import type { PerceptionResult } from '../contracts/perception-result';

describe('IntentDetector', () => {
  let detector: IntentDetector;

  beforeEach(() => {
    detector = new IntentDetector();
  });

  function perception(
    input: string,
    codeBlocks: string[] = [],
  ): PerceptionResult {
     return {
      normalizedInput: input,
      originalInput: input,
      modality: 'TEXT',
      codeBlocks,
      metadata: {},
    } as unknown as PerceptionResult;
  }

  describe('questions', () => {
    it('classifies ordinary explanatory questions as QUESTION', () => {
      const result = detector.detect(
        perception(
          'Explain in one short sentence why Jarvis Brain V2 is working.',
        ),
      );
      expect(result.intent).toBe('QUESTION');
    });

    it('classifies what-is questions as QUESTION', () => {
      expect(detector.detect(perception('What is JWT?')).intent).toBe(
        'QUESTION',
      );
    });

    it('classifies how-does questions as QUESTION', () => {
      expect(
        detector.detect(perception('How does Docker networking work?'))
          .intent,
      ).toBe('QUESTION');
    });

    it('classifies plain factual questions with no technical content as QUESTION', () => {
      expect(detector.detect(perception('Why is the sky blue?')).intent).toBe(
        'QUESTION',
      );
    });

    it('classifies explain-requests about non-technical topics as QUESTION', () => {
      expect(
        detector.detect(perception('Explain distributed systems.')).intent,
      ).toBe('QUESTION');
    });

    it('classifies bare technical-domain mentions as QUESTION, not TECHNICAL (boundary case)', () => {
      // "Kubernetes" is domain vocabulary, not a problem signal — mentioning
      // a technology by name is not the same as reporting a problem with it.
      expect(
        detector.detect(perception('Tell me about Kubernetes.')).intent,
      ).toBe('QUESTION');
    });
  });

  describe('research', () => {
    it('classifies explicit research requests as RESEARCH', () => {
      expect(
        detector.detect(
          perception('Research the history of distributed systems.'),
        ).intent,
      ).toBe('RESEARCH');
    });

    it('classifies explicit search requests as RESEARCH', () => {
      expect(
        detector.detect(
          perception('Search for the latest information about Ollama.'),
        ).intent,
      ).toBe('RESEARCH');
    });

    it('classifies explicit lookup requests as RESEARCH', () => {
      expect(
        detector.detect(
          perception('Look up the current Docker documentation.'),
        ).intent,
      ).toBe('RESEARCH');
    });

    it('classifies explicit investigate requests as RESEARCH', () => {
      expect(
        detector.detect(
          perception('Investigate recent changes in Kubernetes.'),
        ).intent,
      ).toBe('RESEARCH');
    });
  });

  describe('technical', () => {
    it('classifies code questions as TECHNICAL', () => {
      expect(
        detector.detect(
          perception('Why does this TypeScript function throw an error?'),
        ).intent,
      ).toBe('TECHNICAL');
    });

    it('classifies debugging questions as TECHNICAL', () => {
      expect(
        detector.detect(perception('Debug this API endpoint error.')).intent,
      ).toBe('TECHNICAL');
    });

    it('classifies inputs containing code blocks as TECHNICAL', () => {
      expect(
        detector.detect(
          perception('What is wrong with this code?', ['const x = 1;']),
        ).intent,
      ).toBe('TECHNICAL');
    });

    it('classifies fix-requests as TECHNICAL', () => {
      expect(
        detector.detect(perception('Fix this Python function.')).intent,
      ).toBe('TECHNICAL');
    });

    it('classifies problem signals as TECHNICAL even alongside domain vocabulary (boundary case)', () => {
      // "Docker" alone is domain vocabulary; "crashing" is a genuine
      // problem signal that should win regardless of "why" prefix.
      expect(
        detector.detect(perception('Why is my Docker container crashing?'))
          .intent,
      ).toBe('TECHNICAL');
    });

    it('classifies fix-requests as TECHNICAL even when phrased as a question (boundary case)', () => {
      expect(
        detector.detect(
          perception('How do I fix this API returning HTTP 500?'),
        ).intent,
      ).toBe('TECHNICAL');
    });
  });

  describe('commands', () => {
    it('classifies imperative commands as COMMAND', () => {
      expect(
        detector.detect(perception('Run the database migration.')).intent,
      ).toBe('COMMAND');
    });

    it('classifies restart commands as COMMAND', () => {
      expect(
        detector.detect(perception('Restart the server.')).intent,
      ).toBe('COMMAND');
    });

    it('classifies deploy commands as COMMAND', () => {
      expect(
        detector.detect(perception('Deploy the application.')).intent,
      ).toBe('COMMAND');
    });

    it('classifies open commands as COMMAND', () => {
      expect(detector.detect(perception('Open VS Code.')).intent).toBe(
        'COMMAND',
      );
    });
  });

  describe('code generation', () => {
    it('keeps code-writing requests as TECHNICAL', () => {
      expect(
        detector.detect(perception('Create a TypeScript API endpoint.'))
          .intent,
      ).toBe('TECHNICAL');
    });

    it('classifies write-function requests as TECHNICAL', () => {
      expect(
        detector.detect(perception('Write a Python function.')).intent,
      ).toBe('TECHNICAL');
    });

    it('classifies build-app requests as TECHNICAL', () => {
      expect(
        detector.detect(perception('Build a calculator app.')).intent,
      ).toBe('TECHNICAL');
    });

    it('classifies generate-service requests as TECHNICAL', () => {
      expect(
        detector.detect(perception('Generate a NestJS service.')).intent,
      ).toBe('TECHNICAL');
    });
  });
});
