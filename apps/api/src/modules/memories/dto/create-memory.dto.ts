import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsDateString,
} from 'class-validator';

import { MemoryOrigin, MemoryType } from '@jarvis/database';

import type { MemoryMetadata } from '../interfaces/memory-metadata.interface';

export class CreateMemoryDto {
  @IsEnum(MemoryType)
  type!: MemoryType;

  @IsOptional()
  @IsEnum(MemoryOrigin)
  origin?: MemoryOrigin;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsObject()
  metadata?: MemoryMetadata;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  importance?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
