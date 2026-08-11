import { normalizeConfidence } from './base.extractor';

describe('normalizeConfidence', () => {
  it('scales a 0-1 float to 0-100', () => {
    expect(normalizeConfidence(0.83)).toBe(83);
    expect(normalizeConfidence(0.9)).toBe(90);
  });

  it('passes through an already-correct 0-100 integer', () => {
    expect(normalizeConfidence(83)).toBe(83);
    expect(normalizeConfidence(90)).toBe(90);
  });

  it('coerces numeric strings', () => {
    expect(normalizeConfidence('85')).toBe(85);
    expect(normalizeConfidence('0.85')).toBe(85);
  });

  it('clamps out-of-range values', () => {
    expect(normalizeConfidence(140)).toBe(100);
    expect(normalizeConfidence(-15)).toBe(0);
  });

  it('defaults to 80 for missing or invalid values', () => {
    expect(normalizeConfidence(undefined)).toBe(80);
    expect(normalizeConfidence(null)).toBe(80);
    expect(normalizeConfidence(NaN)).toBe(80);
    expect(normalizeConfidence('not-a-number')).toBe(80);
  });

  it('treats exactly 1 as the 0-1 scale (edge case)', () => {
    // 1 is ambiguous between "100% on a 0-1 scale" and "1% on a 0-100 scale".
    // We treat <=1 as 0-1 scale, so this becomes 100.
    expect(normalizeConfidence(1)).toBe(100);
  });
});
