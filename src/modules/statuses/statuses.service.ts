import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

const DEFAULT_STATUS_COLOR = '#64748b';

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

  async create(ownerId: string, dto: CreateStatusDto) {
    const order = dto.order ?? (await this.nextOrder(ownerId));

    try {
      return await this.prisma.status.create({
        data: {
          ownerId,
          name: dto.name.trim(),
          color: dto.color ?? DEFAULT_STATUS_COLOR,
          order,
        },
      });
    } catch (error) {
      this.handleUniqueStatusName(error);
    }
  }

  async update(ownerId: string, id: string, dto: UpdateStatusDto) {
    await this.ensureOwnedStatus(ownerId, id);

    try {
      return await this.prisma.status.update({
        where: { id },
        data: {
          ...dto,
          name: dto.name?.trim(),
        },
      });
    } catch (error) {
      this.handleUniqueStatusName(error);
    }
  }

  async remove(ownerId: string, id: string, moveToStatusId?: string) {
    const status = await this.ensureOwnedStatus(ownerId, id);

    if (moveToStatusId === id) {
      throw new BadRequestException('Choose a different status to receive the leads.');
    }

    if (moveToStatusId) {
      await this.ensureOwnedStatus(ownerId, moveToStatusId);
      return this.prisma.$transaction(async (prisma) => {
        await prisma.lead.updateMany({
          where: { ownerId, statusId: status.id },
          data: { statusId: moveToStatusId },
        });

        return prisma.status.delete({ where: { id } });
      });
    }

    const leadsCount = await this.prisma.lead.count({ where: { ownerId, statusId: status.id } });
    if (leadsCount > 0) {
      throw new BadRequestException('Move leads before deleting this status.');
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

  private async nextOrder(ownerId: string) {
    const aggregate = await this.prisma.status.aggregate({
      where: { ownerId },
      _max: { order: true },
    });

    return (aggregate._max.order ?? -1) + 1;
  }

  private handleUniqueStatusName(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A status with this name already exists.');
    }

    throw error;
  }
}
