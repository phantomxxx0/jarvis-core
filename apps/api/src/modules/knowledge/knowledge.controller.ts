import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CodebaseIndexerService } from './services/codebase-indexer.service';

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly indexerService: CodebaseIndexerService) { }

  @Post('index')
  async indexCodebase(@Req() req: any) {
    // Extract the authenticated user's valid UUID from JWT payload
    const userId = req.user?.id || req.user?.sub;
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