import { NotFoundException } from '@nestjs/common';
import { ImoveisService } from './imoveis.service';

describe('ImoveisService', () => {
  const prisma = {
    $transaction: jest.fn(),
    imovel: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lead: {
      updateMany: jest.fn(),
    },
  };

  let service: ImoveisService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    service = new ImoveisService(prisma as never);
  });

  it('lista imoveis do dono', async () => {
    prisma.imovel.findMany.mockResolvedValue([]);

    await service.list('owner-1');

    expect(prisma.imovel.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1' },
      include: { leads: true },
      orderBy: { updatedAt: 'desc' },
    });
  });

  it('cria um imovel avulso', async () => {
    prisma.imovel.create.mockResolvedValue({ id: 'imovel-1' });

    await service.create('owner-1', {
      title: 'Apartamento no Centro',
      price: 450000,
    });

    expect(prisma.imovel.create).toHaveBeenCalledWith({
      data: {
        ownerId: 'owner-1',
        title: 'Apartamento no Centro',
        propertyType: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        price: 450000,
        bedrooms: undefined,
        bathrooms: undefined,
        areaM2: undefined,
        notes: undefined,
      },
      include: { leads: true },
    });
  });

  it('atualiza o valor dos leads quando o imovel vinculado muda de valor', async () => {
    prisma.imovel.findFirst.mockResolvedValue({ id: 'imovel-1', leads: [{ id: 'lead-1' }] });
    prisma.imovel.update.mockResolvedValue({ id: 'imovel-1', price: 500000 });

    await service.update('owner-1', 'imovel-1', { price: 500000 });

    expect(prisma.lead.updateMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1', imovelId: 'imovel-1' },
      data: { value: 500000 },
    });
  });

  it('limpa o valor e vinculo dos leads ao remover um imovel vinculado', async () => {
    prisma.imovel.findFirst.mockResolvedValue({ id: 'imovel-1', leads: [{ id: 'lead-1' }] });
    prisma.imovel.delete.mockResolvedValue({ id: 'imovel-1' });

    await service.remove('owner-1', 'imovel-1');

    expect(prisma.lead.updateMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1', imovelId: 'imovel-1' },
      data: { imovelId: null, value: null },
    });
    expect(prisma.imovel.delete).toHaveBeenCalledWith({ where: { id: 'imovel-1' } });
  });

  it('lanca erro quando o imovel nao pertence ao dono', async () => {
    prisma.imovel.findFirst.mockResolvedValue(null);

    await expect(service.get('owner-1', 'imovel-1')).rejects.toThrow(NotFoundException);
  });
});
