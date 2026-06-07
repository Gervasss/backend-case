import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ example: 'user', enum: ['user', 'assistant', 'system'] })
  @IsIn(['user', 'assistant', 'system'])
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({ example: 'Quais leads devo priorizar hoje?' })
  @IsString()
  @MinLength(1)
  content: string;
}
