import { Module } from '@nestjs/common';

import { MemoriesModule } from '../memories/memories.module';

import { KnowledgeService } from './knowledge.service';

import { KnowledgeExtractorService } from './services/knowledge-extractor.service';
import { KnowledgeLookupService } from './services/knowledge-lookup.service';
import { NormalizerService } from './services/normalizer.service';
import { CanonicalizerService } from './services/canonicalizer.service';
import { ValidatorService } from './services/validator.service';
import { ConfidenceService } from './services/confidence.service';
import { ImportanceService } from './services/importance.service';
import { DeduplicatorService } from './services/deduplicator.service';

import { KnowledgeComparatorService } from './evolution/knowledge-comparator.service';
import { KnowledgePolicyService } from './policies/knowledge-policy.service';

import { RuleRegistry } from './rules/rule.registry';
import { NameRule } from './rules/name.rule';

@Module({
  imports: [MemoriesModule],

  providers: [
    // Core
    KnowledgeService,

    // Pipeline
    KnowledgeExtractorService,
    KnowledgeLookupService,
    NormalizerService,
    CanonicalizerService,
    ValidatorService,
    ConfidenceService,
    ImportanceService,
    DeduplicatorService,

    // Evolution
    KnowledgeComparatorService,
    KnowledgePolicyService,

    // Rules
    NameRule,

    // Registry
    RuleRegistry,
  ],

  exports: [
    // Core
    KnowledgeService,

    // Pipeline
    KnowledgeExtractorService,
    KnowledgeLookupService,
    NormalizerService,
    CanonicalizerService,
    ValidatorService,
    ConfidenceService,
    ImportanceService,
    DeduplicatorService,

    // Evolution
    KnowledgeComparatorService,
    KnowledgePolicyService,

    // Rules
    NameRule,

    // Registry
    RuleRegistry,
  ],
})
export class KnowledgeModule {}
