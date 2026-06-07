import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateStatusDto {
  @ApiProperty({ example: 'Qualified' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '#2563eb', required: false })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
