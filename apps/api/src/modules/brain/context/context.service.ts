import { Injectable } from '@nestjs/common';
import { ContextBuilder } from './context.builder';
import { ContextBundle } from './contracts/context-provider.interface';

@Injectable()
export class ContextService {
  constructor(private readonly contextBuilder: ContextBuilder) {}

  public async getContextBundle(
    query: string,
    maxSections?: number,
    maxChars?: number,
  ): Promise<ContextBundle> {
    return this.contextBuilder.buildUnifiedContext(
      query,
      maxSections,
      maxChars,
    );
  }
}
