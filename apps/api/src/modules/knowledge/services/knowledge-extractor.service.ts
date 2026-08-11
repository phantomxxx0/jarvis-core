import { Injectable } from '@nestjs/common';

import { KnowledgeFact } from '../interfaces/knowledge-fact.interface';

import { NormalizerService } from './normalizer.service';
import { CanonicalizerService } from './canonicalizer.service';
import { ValidatorService } from './validator.service';
import { ConfidenceService } from './confidence.service';
import { ImportanceService } from './importance.service';
import { DeduplicatorService } from './deduplicator.service';

@Injectable()
export class KnowledgeExtractorService {
  constructor(
    private readonly normalizer: NormalizerService,
    private readonly canonicalizer: CanonicalizerService,
    private readonly validator: ValidatorService,
    private readonly confidence: ConfidenceService,
    private readonly importance: ImportanceService,
    private readonly deduplicator: DeduplicatorService,
  ) {}

  extract(text: string): KnowledgeFact[] {
    const normalized = this.normalizer.normalize(text);

    let facts = this.canonicalizer.canonicalize(normalized);

    facts = this.validator.validate(facts);

    facts = this.confidence.score(facts);

    facts = this.importance.rank(facts);

    facts = this.deduplicator.process(facts);

    return facts;
  }
}
