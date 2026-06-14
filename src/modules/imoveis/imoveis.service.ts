import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImovelDto } from './dto/create-imovel.dto';
import { UpdateImovelDto } from './dto/update-imovel.dto';

type PrismaExecutor = PrismaService | Prisma.TransactionClient | PrismaClient;

@Injectable()
export class ImoveisService {
  constructor(private readonly prisma: PrismaService) {}

  list(ownerId: string) {
    return this.prisma.imovel.findMany({
      where: { ownerId },
      include: { leads: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(ownerId: string, id: string) {
    const imovel = await this.prisma.imovel.findFirst({
      where: { id, ownerId },
      include: { leads: true },
    });
    if (!imovel) {
      throw new NotFoundException('Imovel not found.');
    }
    return imovel;
  }

  create(ownerId: string, dto: CreateImovelDto) {
    return this.prisma.imovel.create({
      data: this.toImovelData(ownerId, dto),
      include: { leads: true },
    });
  }

  createForLead(
    ownerId: string,
    dto: CreateImovelDto,
    prisma: PrismaExecutor = this.prisma,
  ) {
    return prisma.imovel.create({
      data: this.toImovelData(ownerId, dto),
    });
  }

  async update(ownerId: string, id: string, dto: UpdateImovelDto) {
    const imovel = await this.get(ownerId, id);
    return this.prisma.$transaction(async (prisma) => {
      const updatedImovel = await prisma.imovel.update({
        where: { id },
        data: this.toImovelUpdateData(dto),
        include: { leads: true },
      });

      if (dto.price !== undefined) {
        await prisma.lead.updateMany({
          where: { ownerId, imovelId: id },
          data: { value: dto.price },
        });
      }

      return updatedImovel;
    });
  }

  async remove(ownerId: string, id: string) {
    await this.get(ownerId, id);
    return this.prisma.$transaction(async (prisma) => {
      await prisma.lead.updateMany({
        where: { ownerId, imovelId: id },
        data: { imovelId: null, value: null },
      });

      return prisma.imovel.delete({ where: { id } });
    });
  }

  private toImovelData(ownerId: string, dto: CreateImovelDto): Prisma.ImovelUncheckedCreateInput {
    return {
      ownerId,
      title: dto.title,
      propertyType: dto.propertyType,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      price: dto.price,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      areaM2: dto.areaM2,
      notes: dto.notes,
    };
  }

  private toImovelUpdateData(dto: UpdateImovelDto): Prisma.ImovelUncheckedUpdateInput {
    return {
      title: dto.title,
      propertyType: dto.propertyType,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      price: dto.price,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      areaM2: dto.areaM2,
      notes: dto.notes,
    };
  }
}
