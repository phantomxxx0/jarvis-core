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

import { MemoryType } from '@jarvis/database';

export class UpdateMemoryDto {
  @IsOptional()
  @IsEnum(MemoryType)
  type?: MemoryType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  importance?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
