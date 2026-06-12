import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateImovelDto {
  @ApiProperty({ example: 'Apartamento no Centro' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ example: 'Apartamento', required: false })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiProperty({ example: 'Rua das Flores, 123', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Sao Paulo', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'SP', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 450000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiProperty({ example: 68.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaM2?: number;

  @ApiProperty({ example: 'Cliente quer visitar no sabado.', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
