import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MoveLeadDto {
  @ApiProperty({ example: '3f054d91-f6ca-4d4a-90fb-7dc8ea61fd2d' })
  @IsUUID()
  statusId: string;
}
