// apps/api/src/modules/workers/inference/providers/ollama/ollama.mapper.spec.ts

import { OllamaMapper } from './ollama.mapper';
import { InferenceRequest } from '../../contracts/inference-request';

describe('OllamaMapper.toChatRequest - keep_alive mapping', () => {
  const baseRequest: InferenceRequest = {
    modelId: 'test-model',
    messages: [{ role: 'user', content: 'hello' }],
  };

  it('maps explicit numeric keepAlive to keep_alive', () => {
    const request = { ...baseRequest, keepAlive: 3600 } as InferenceRequest;
    const result = OllamaMapper.toChatRequest(request);
    expect(result.keep_alive).toBe(3600);
  });

  it('maps explicit string keepAlive to keep_alive', () => {
    const request = { ...baseRequest, keepAlive: '10m' } as InferenceRequest;
    const result = OllamaMapper.toChatRequest(request);
    expect(result.keep_alive).toBe('10m');
  });

  it('falls back to extraOptions.keep_alive when keepAlive is undefined', () => {
    const request = {
      ...baseRequest,
      extraOptions: { keep_alive: '5m' },
    } as InferenceRequest;
    const result = OllamaMapper.toChatRequest(request);
    expect(result.keep_alive).toBe('5m');
  });

  it('falls back to extraOptions.keep_alive numeric when keepAlive is undefined', () => {
    const request = {
      ...baseRequest,
      extraOptions: { keep_alive: 300 },
    } as InferenceRequest;
    const result = OllamaMapper.toChatRequest(request);
    expect(result.keep_alive).toBe(300);
  });

  it('defaults to -1 when neither keepAlive nor extraOptions.keep_alive is provided', () => {
    const request = baseRequest;
    const result = OllamaMapper.toChatRequest(request);
    expect(result.keep_alive).toBe(-1);
  });

  it('treats explicit keepAlive: 0 as 0 (not missing)', () => {
    const request = { ...baseRequest, keepAlive: 0 } as InferenceRequest;
    const result = OllamaMapper.toChatRequest(request);
    expect(result.keep_alive).toBe(0);
  });

  it('treats explicit keepAlive: "" as "" (not missing)', () => {
    const request = { ...baseRequest, keepAlive: '' } as InferenceRequest;
    const result = OllamaMapper.toChatRequest(request);
    expect(result.keep_alive).toBe('');
  });

  it('prefers explicit keepAlive over extraOptions.keep_alive', () => {
    const request = {
      ...baseRequest,
      keepAlive: 7200,
      extraOptions: { keep_alive: '1h' },
    } as InferenceRequest;
    const result = OllamaMapper.toChatRequest(request);
    expect(result.keep_alive).toBe(7200);
  });

  it('handles extraOptions being undefined', () => {
    const request = { ...baseRequest, extraOptions: undefined } as InferenceRequest;
    const result = OllamaMapper.toChatRequest(request);
    expect(result.keep_alive).toBe(-1);
  });
});
