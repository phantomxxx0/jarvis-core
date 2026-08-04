import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CodebaseIndexerService } from './services/codebase-indexer.service';

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly indexerService: CodebaseIndexerService) {}

  @Post('index')
  async indexCodebase(@Req() req: unknown) {
    const request = req as Record<string, unknown>;
    const user = request.user as Record<string, unknown> | undefined;

    // Extract the authenticated user's valid UUID from JWT payload
    const userId = (user?.id || user?.sub) as string | undefined;
    if (!userId) {
      throw new Error('Unauthorized: User ID not found in token context.');
    }

    const result = await this.indexerService.indexRepository(userId);
    return {
      success: true,
      statusCode: 201,
      timestamp: new Date().toISOString(),
      path: '/knowledge/index',
      data: result,
    };
  }
}
