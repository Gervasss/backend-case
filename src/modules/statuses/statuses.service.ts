import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

const DEFAULT_STATUSES = [
  { name: 'Novo', color: '#0ea5e9', order: 0 },
  { name: 'Qualificado', color: '#6366f1', order: 1 },
  { name: 'Proposta', color: '#f59e0b', order: 2 },
  { name: 'Ganho', color: '#22c55e', order: 3 },
  { name: 'Perdido', color: '#ef4444', order: 4 },
];

@Injectable()
export class StatusesService {
  constructor(private readonly prisma: PrismaService) {}

  createDefaultPipeline(ownerId: string) {
    return this.prisma.status.createMany({
      data: DEFAULT_STATUSES.map((status) => ({ ...status, ownerId })),
      skipDuplicates: true,
    });
  }

  list(ownerId: string) {
    return this.prisma.status.findMany({
      where: { ownerId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { leads: true } } },
    });
  }

  create(ownerId: string, dto: CreateStatusDto) {
    return this.prisma.status.create({
      data: {
        ownerId,
        name: dto.name,
        color: dto.color,
        order: dto.order,
      },
    });
  }

  async update(ownerId: string, id: string, dto: UpdateStatusDto) {
    await this.ensureOwnedStatus(ownerId, id);
    return this.prisma.status.update({
      where: { id },
      data: dto,
    });
  }

  async remove(ownerId: string, id: string) {
    const status = await this.ensureOwnedStatus(ownerId, id);
    const leadsCount = await this.prisma.lead.count({ where: { ownerId, statusId: status.id } });
    if (leadsCount > 0) {
      throw new NotFoundException('Move leads before deleting this status.');
    }

    return this.prisma.status.delete({ where: { id } });
  }

  async ensureOwnedStatus(ownerId: string, id: string) {
    const status = await this.prisma.status.findFirst({ where: { id, ownerId } });
    if (!status) {
      throw new NotFoundException('Status not found.');
    }
    return status;
  }
}
