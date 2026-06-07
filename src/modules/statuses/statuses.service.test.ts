import { NotFoundException } from '@nestjs/common';
import { StatusesService } from './statuses.service';

describe('StatusesService', () => {
  const prisma = {
    status: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    lead: {
      count: jest.fn(),
    },
  };

  let service: StatusesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StatusesService(prisma as never);
  });

  it('cria o pipeline padrao para o dono', async () => {
    prisma.status.createMany.mockResolvedValue({ count: 5 });

    await service.createDefaultPipeline('owner-1');

    expect(prisma.status.createMany).toHaveBeenCalledWith({
      data: [
        { name: 'Novo', color: '#0ea5e9', order: 0, ownerId: 'owner-1' },
        { name: 'Qualificado', color: '#6366f1', order: 1, ownerId: 'owner-1' },
        { name: 'Proposta', color: '#f59e0b', order: 2, ownerId: 'owner-1' },
        { name: 'Ganho', color: '#22c55e', order: 3, ownerId: 'owner-1' },
        { name: 'Perdido', color: '#ef4444', order: 4, ownerId: 'owner-1' },
      ],
      skipDuplicates: true,
    });
  });

  it('lista status ordenados pela ordem configurada e data de criacao', async () => {
    prisma.status.findMany.mockResolvedValue([]);

    await service.list('owner-1');

    expect(prisma.status.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { leads: true } } },
    });
  });

  it('bloqueia a exclusao de um status que ainda possui leads', async () => {
    prisma.status.findFirst.mockResolvedValue({ id: 'status-1' });
    prisma.lead.count.mockResolvedValue(1);

    await expect(service.remove('owner-1', 'status-1')).rejects.toThrow(NotFoundException);
    expect(prisma.status.delete).not.toHaveBeenCalled();
  });

  it('exclui um status vazio que pertence ao dono', async () => {
    prisma.status.findFirst.mockResolvedValue({ id: 'status-1' });
    prisma.lead.count.mockResolvedValue(0);
    prisma.status.delete.mockResolvedValue({ id: 'status-1' });

    await service.remove('owner-1', 'status-1');

    expect(prisma.status.delete).toHaveBeenCalledWith({ where: { id: 'status-1' } });
  });

  it('lanca erro quando o status nao pertence ao usuario', async () => {
    prisma.status.findFirst.mockResolvedValue(null);

    await expect(service.ensureOwnedStatus('owner-1', 'status-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
