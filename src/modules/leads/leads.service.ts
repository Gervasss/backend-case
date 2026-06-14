import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ImoveisService } from '../imoveis/imoveis.service';
import { PrismaService } from '../prisma/prisma.service';
import { StatusesService } from '../statuses/statuses.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { MoveLeadDto } from './dto/move-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statusesService: StatusesService,
    private readonly imoveisService: ImoveisService,
  ) {}

  async list(ownerId: string, query: ListLeadsQueryDto) {
    const where = this.buildWhere(ownerId, query);
    return this.prisma.lead.findMany({
      where,
      include: { status: true, imovel: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async kanban(ownerId: string) {
    const statuses = await this.prisma.status.findMany({
      where: { ownerId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        leads: {
          orderBy: { updatedAt: 'desc' },
          include: { imovel: true },
        },
      },
    });

    return statuses.map((status) => ({
      id: status.id,
      name: status.name,
      color: status.color,
      order: status.order,
      leads: status.leads,
    }));
  }

  async get(ownerId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, ownerId },
      include: { status: true, imovel: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found.');
    }
    return lead;
  }

  async create(ownerId: string, dto: CreateLeadDto) {
    await this.statusesService.ensureOwnedStatus(ownerId, dto.statusId);

    if (dto.imovel && dto.imovelId) {
      throw new BadRequestException('Use either imovelId or imovel data, not both.');
    }

    const linkedImovel = dto.imovelId ? await this.ensureOwnedImovel(ownerId, dto.imovelId) : null;

    return this.prisma.$transaction(async (prisma) => {
      const lead = await prisma.lead.create({
        data: this.toLeadData(ownerId, dto, linkedImovel?.price),
      });

      if (dto.imovel) {
        const imovel = await this.imoveisService.createForLead(ownerId, dto.imovel, prisma);
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            imovelId: imovel.id,
            value: imovel.price ?? dto.value,
          },
        });
      }

      return prisma.lead.findUniqueOrThrow({
        where: { id: lead.id },
        include: { status: true, imovel: true },
      });
    });
  }

  async update(ownerId: string, id: string, dto: UpdateLeadDto) {
    await this.get(ownerId, id);
    if (dto.statusId) {
      await this.statusesService.ensureOwnedStatus(ownerId, dto.statusId);
    }

    if (dto.imovel && dto.imovelId) {
      throw new BadRequestException('Use either imovelId or imovel data, not both.');
    }

    const linkedImovel = dto.imovelId ? await this.ensureOwnedImovel(ownerId, dto.imovelId) : null;

    return this.prisma.lead.update({
      where: { id },
      data: this.toLeadUpdateData(dto, linkedImovel?.price),
      include: { status: true, imovel: true },
    });
  }

  async move(ownerId: string, id: string, dto: MoveLeadDto) {
    await this.get(ownerId, id);
    await this.statusesService.ensureOwnedStatus(ownerId, dto.statusId);

    return this.prisma.lead.update({
      where: { id },
      data: { statusId: dto.statusId },
      include: { status: true, imovel: true },
    });
  }

  async remove(ownerId: string, id: string) {
    await this.get(ownerId, id);
    return this.prisma.lead.delete({ where: { id } });
  }

  private buildWhere(ownerId: string, query: ListLeadsQueryDto): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = { ownerId };
    if (query.statusId) {
      where.statusId = query.statusId;
    }
    if (query.search) {
      where.OR = [
        { company: { contains: query.search, mode: 'insensitive' } },
        { contactName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private toLeadData(
    ownerId: string,
    dto: CreateLeadDto,
    linkedImovelPrice?: number | null,
  ): Prisma.LeadUncheckedCreateInput {
    return {
      ownerId,
      company: dto.company,
      contactName: dto.contactName,
      email: dto.email,
      phone: dto.phone,
      value: dto.imovel?.price ?? linkedImovelPrice ?? dto.value,
      source: dto.source,
      notes: dto.notes,
      nextFollowUp: dto.nextFollowUp ? new Date(dto.nextFollowUp) : undefined,
      statusId: dto.statusId,
      imovelId: dto.imovelId,
    };
  }

  private toLeadUpdateData(
    dto: UpdateLeadDto,
    linkedImovelPrice?: number | null,
  ): Prisma.LeadUncheckedUpdateInput {
    const { imovel, ...leadDto } = dto;
    void imovel;

    return {
      ...leadDto,
      value: linkedImovelPrice ?? leadDto.value,
      nextFollowUp: leadDto.nextFollowUp ? new Date(leadDto.nextFollowUp) : undefined,
    };
  }

  private async ensureOwnedImovel(ownerId: string, id: string) {
    const imovel = await this.prisma.imovel.findFirst({
      where: { id, ownerId },
    });

    if (!imovel) {
      throw new NotFoundException('Imovel not found.');
    }

    return imovel;
  }
}
