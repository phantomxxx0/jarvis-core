import { Injectable, Logger } from '@nestjs/common';
import { AutonomousExecutionController } from './autonomous/autonomous-controller.service';

@Injectable()
export class BrainService {
  private readonly logger = new Logger(BrainService.name);

  constructor(
    private readonly autonomousController: AutonomousExecutionController,
  ) {}

  async processChat(
    messages: Array<{ role: string; content: string }>,
    userId = 'system',
  ): Promise<{ answer: string; success: boolean; riskLevel?: string }> {
    const latestMessage = messages[messages.length - 1]?.content || '';
    const answer = await this.think(latestMessage, userId);
    return {
      answer,
      success: true,
    };
  }

  async processIntent(
    mission: string,
    contextSummary: string, // unused but kept for interface compatibility
  ): Promise<unknown> {
    const startTime = Date.now();
    const result = await this.autonomousController.executeGoal(
      mission,
      'system',
    );

    return {
      traceId: result.trace.traceId,
      userPrompt: mission,
      stages: [], // Legacy compatibility
      finalResult: {
        success: result.success,
        output: [result.answer],
        totalDurationMs: Date.now() - startTime,
        trace: result.trace,
      },
    };
  }

  async think(
    prompt: string,
    userId = 'system',
    onProgress?: (event: string, data: any) => void,
  ): Promise<string> {
    onProgress?.('status', {
      message: 'Delegating to Autonomous Execution Controller...',
    });
    const executionResult = await this.autonomousController.executeGoal(
      prompt,
      userId,
    );
    return executionResult.answer;
  }
}
