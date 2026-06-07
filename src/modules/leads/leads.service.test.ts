import { NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';

describe('LeadsService', () => {
  const prisma = {
    lead: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    status: {
      findMany: jest.fn(),
    },
  };
  const statusesService = {
    ensureOwnedStatus: jest.fn(),
  };

  let service: LeadsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeadsService(prisma as never, statusesService as never);
  });

  it('lista leads do dono com filtros de busca e status', async () => {
    prisma.lead.findMany.mockResolvedValue([]);

    await service.list('owner-1', { search: 'acme', statusId: 'status-1' });

    expect(prisma.lead.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: 'owner-1',
        statusId: 'status-1',
        OR: [
          { company: { contains: 'acme', mode: 'insensitive' } },
          { contactName: { contains: 'acme', mode: 'insensitive' } },
          { email: { contains: 'acme', mode: 'insensitive' } },
        ],
      },
      include: { status: true },
      orderBy: { updatedAt: 'desc' },
    });
  });

  it('cria um lead somente apos validar o dono do status', async () => {
    prisma.lead.create.mockResolvedValue({ id: 'lead-1' });
    statusesService.ensureOwnedStatus.mockResolvedValue({ id: 'status-1' });

    await service.create('owner-1', {
      company: 'Acme',
      contactName: 'Ana',
      email: 'ana@acme.com',
      value: 1000,
      statusId: 'status-1',
      nextFollowUp: '2026-06-15T14:00:00.000Z',
    });

    expect(statusesService.ensureOwnedStatus).toHaveBeenCalledWith('owner-1', 'status-1');
    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: {
        ownerId: 'owner-1',
        company: 'Acme',
        contactName: 'Ana',
        email: 'ana@acme.com',
        phone: undefined,
        value: 1000,
        source: undefined,
        notes: undefined,
        nextFollowUp: new Date('2026-06-15T14:00:00.000Z'),
        statusId: 'status-1',
      },
      include: { status: true },
    });
  });

  it('lanca erro quando o lead nao pertence ao dono', async () => {
    prisma.lead.findFirst.mockResolvedValue(null);

    await expect(service.get('owner-1', 'lead-1')).rejects.toThrow(NotFoundException);
  });

  it('move um lead apos validar o dono do lead e do status', async () => {
    prisma.lead.findFirst.mockResolvedValue({ id: 'lead-1', ownerId: 'owner-1' });
    statusesService.ensureOwnedStatus.mockResolvedValue({ id: 'status-2' });
    prisma.lead.update.mockResolvedValue({ id: 'lead-1', statusId: 'status-2' });

    await service.move('owner-1', 'lead-1', { statusId: 'status-2' });

    expect(prisma.lead.findFirst).toHaveBeenCalledWith({
      where: { id: 'lead-1', ownerId: 'owner-1' },
      include: { status: true },
    });
    expect(statusesService.ensureOwnedStatus).toHaveBeenCalledWith('owner-1', 'status-2');
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { statusId: 'status-2' },
      include: { status: true },
    });
  });
});
