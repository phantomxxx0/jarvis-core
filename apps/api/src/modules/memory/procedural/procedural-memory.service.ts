import { Injectable, Logger } from '@nestjs/common';
import {
  IMemoryService,
  MemoryContext,
  MemoryRankParams,
  MemoryRetrievalParams,
  MemoryStoreParams,
  MemoryUpdateParams,
} from '../interfaces/memory-service.interface';
import { ProcedureRepository } from './procedure.repository';

export interface ProceduralMemoryData {
  id?: string;
  title: string;
  description?: string;
  steps: Array<{
    instruction: string;
    command?: string;
  }>;
}

@Injectable()
export class ProceduralMemoryService implements IMemoryService<ProceduralMemoryData> {
  private readonly logger = new Logger(ProceduralMemoryService.name);

  constructor(private readonly procedureRepo: ProcedureRepository) {}

  async store(
    params: MemoryStoreParams<ProceduralMemoryData>,
  ): Promise<ProceduralMemoryData> {
    await this.procedureRepo.create({
      userId: params.userId,
      title: params.data.title,
      description: params.data.description,
      steps: params.data.steps,
    });
    return params.data;
  }

  async retrieve(
    params: MemoryRetrievalParams,
  ): Promise<ProceduralMemoryData[]> {
    const procs = await this.procedureRepo.search(
      params.userId,
      params.query,
      params.limit,
    );
    const results: ProceduralMemoryData[] = [];
    for (const p of procs) {
      const steps = await this.procedureRepo.getSteps(p.id);
      results.push({
        id: p.id,
        title: p.title,
        description: p.description ?? undefined,
        steps: steps.map((s) => ({
          instruction: s.instruction,
          command: s.command ?? undefined,
        })),
      });
    }
    return results;
  }

  async update(
    params: MemoryUpdateParams<ProceduralMemoryData>,
  ): Promise<ProceduralMemoryData> {
    throw new Error('Method not implemented.');
  }

  async rank(params: MemoryRankParams): Promise<number> {
    return 100;
  }

  async summarize(memoryIds: string[]): Promise<string> {
    return 'Procedural memory summary stub';
  }

  async composeContext(
    params: MemoryRetrievalParams,
  ): Promise<MemoryContext[]> {
    const data = await this.retrieve(params);
    return data.map((p) => ({
      content: `Workflow: ${p.title}\nSteps:\n${p.steps.map((s) => `- ${s.instruction} ${s.command ? `(${s.command})` : ''}`).join('\n')}`,
      source: 'ProceduralMemory',
      confidence: 85,
      memoryId: p.id,
    }));
  }
}
