import { BadRequestException, NotFoundException } from '@nestjs/common';
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
      aggregate: jest.fn(),
    },
    lead: {
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: StatusesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
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

  it('cria um status customizado com cor e proxima ordem automatica', async () => {
    prisma.status.aggregate.mockResolvedValue({ _max: { order: 4 } });
    prisma.status.create.mockResolvedValue({ id: 'status-6' });

    await service.create('owner-1', { name: '  Visita agendada  ', color: '#14b8a6' });

    expect(prisma.status.create).toHaveBeenCalledWith({
      data: {
        ownerId: 'owner-1',
        name: 'Visita agendada',
        color: '#14b8a6',
        order: 5,
      },
    });
  });

  it('atualiza nome, cor e ordem de um status do dono', async () => {
    prisma.status.findFirst.mockResolvedValue({ id: 'status-1' });
    prisma.status.update.mockResolvedValue({ id: 'status-1' });

    await service.update('owner-1', 'status-1', {
      name: '  Fechado  ',
      color: '#22c55e',
      order: 3,
    });

    expect(prisma.status.update).toHaveBeenCalledWith({
      where: { id: 'status-1' },
      data: {
        name: 'Fechado',
        color: '#22c55e',
        order: 3,
      },
    });
  });

  it('bloqueia a exclusao de um status que ainda possui leads', async () => {
    prisma.status.findFirst.mockResolvedValue({ id: 'status-1' });
    prisma.lead.count.mockResolvedValue(1);

    await expect(service.remove('owner-1', 'status-1')).rejects.toThrow(BadRequestException);
    expect(prisma.status.delete).not.toHaveBeenCalled();
  });

  it('move os leads para outro status antes de excluir', async () => {
    prisma.status.findFirst
      .mockResolvedValueOnce({ id: 'status-1' })
      .mockResolvedValueOnce({ id: 'status-2' });
    prisma.lead.updateMany.mockResolvedValue({ count: 2 });
    prisma.status.delete.mockResolvedValue({ id: 'status-1' });

    await service.remove('owner-1', 'status-1', 'status-2');

    expect(prisma.lead.updateMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1', statusId: 'status-1' },
      data: { statusId: 'status-2' },
    });
    expect(prisma.status.delete).toHaveBeenCalledWith({ where: { id: 'status-1' } });
  });

  it('bloqueia mover leads para o mesmo status que sera excluido', async () => {
    prisma.status.findFirst.mockResolvedValue({ id: 'status-1' });

    await expect(service.remove('owner-1', 'status-1', 'status-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.lead.updateMany).not.toHaveBeenCalled();
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
