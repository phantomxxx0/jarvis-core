import { IsArray, IsIn, IsString, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ChatMessageDto {
  @IsIn(['system', 'user', 'assistant'])
  role!: 'system' | 'user' | 'assistant';

  @IsString()
  content!: string;
}

export class ChatDto {
  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
}
