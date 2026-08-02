import { Injectable } from '@nestjs/common';

@Injectable()
export class NormalizerService {
  normalize(text: string): string {
    let normalized = text.trim();

    //
    // Common contractions
    //
    normalized = normalized.replace(/\bim\b/gi, 'I am');
    normalized = normalized.replace(/\bi'm\b/gi, 'I am');
    normalized = normalized.replace(/\bive\b/gi, 'I have');
    normalized = normalized.replace(/\bi've\b/gi, 'I have');

    //
    // Technology normalization
    //
    normalized = normalized.replace(/\bvscode\b/gi, 'VS Code');
    normalized = normalized.replace(/\bts\b/gi, 'TypeScript');
    normalized = normalized.replace(/\bjs\b/gi, 'JavaScript');
    normalized = normalized.replace(/\barch\b/gi, 'Arch Linux');
    normalized = normalized.replace(/\bubuntu linux\b/gi, 'Ubuntu');
    normalized = normalized.replace(/\bcursor ai\b/gi, 'Cursor');

    //
    // Sentence capitalization
    //
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);

    //
    // Final punctuation
    //
    if (!/[.!?]$/.test(normalized)) {
      normalized += '.';
    }

    return normalized;
  }
}
