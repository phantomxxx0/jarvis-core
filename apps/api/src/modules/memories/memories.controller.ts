import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateMemoryDto } from './dto/create-memory.dto';
import { UpdateMemoryDto } from './dto/update-memory.dto';
import { MemoriesService } from './memories.service';
import { MemoryOrigin } from '@jarvis/database';

@Controller('memories')
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMemoryDto) {
    return this.memoriesService.create({
      ...dto,
      origin: dto.origin ?? MemoryOrigin.MANUAL,
      userId: user.id,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.memoriesService.findByUserId(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.memoriesService.findById(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMemoryDto,
  ) {
    return this.memoriesService.update(user.id, id, {
      ...dto,
      expiresAt:
        dto.expiresAt === undefined
          ? undefined
          : dto.expiresAt === null
            ? null
            : new Date(dto.expiresAt),
    });
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    await this.memoriesService.archive(user.id, id);
  }
}
