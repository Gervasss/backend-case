import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateImovelDto } from '../../imoveis/dto/create-imovel.dto';

export class CreateLeadDto {
  @ApiProperty({ example: 'Acme Ltda' })
  @IsString()
  @MinLength(2)
  company: string;

  @ApiProperty({ example: 'Carla Souza' })
  @IsString()
  @MinLength(2)
  contactName: string;

  @ApiProperty({ example: 'carla@acme.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+55 11 99999-9999', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 12500, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiProperty({ example: 'Website', required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ example: 'Interested in enterprise plan.', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: '2026-06-15T14:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  nextFollowUp?: string;

  @ApiProperty({ example: '3f054d91-f6ca-4d4a-90fb-7dc8ea61fd2d' })
  @IsUUID()
  statusId: string;

  @ApiProperty({ required: false, type: CreateImovelDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateImovelDto)
  imovel?: CreateImovelDto;
}
