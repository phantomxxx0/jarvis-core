import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsString()
  role: string;

  @IsString()
  content: string;
}

export class ChatCompletionDto {
  @IsString()
  @IsIn(['jarvis-core'])
  model: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}
