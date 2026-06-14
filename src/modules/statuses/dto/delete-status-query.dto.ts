import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class DeleteStatusQueryDto {
  @ApiProperty({
    example: '3f054d91-f6ca-4d4a-90fb-7dc8ea61fd2d',
    required: false,
    description: 'Status that will receive the leads before deleting the current status.',
  })
  @IsOptional()
  @IsUUID()
  moveToStatusId?: string;
}
