import { AiService } from './ai.service';

describe('AiService', () => {
  const config = {
    get: jest.fn(),
  };
  const prisma = {
    status: {
      findMany: jest.fn(),
    },
    lead: {
      findMany: jest.fn(),
    },
    imovel: {
      findMany: jest.fn(),
    },
  };

  let service: AiService;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
    config.get.mockReturnValue('http://ai.local');
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ answer: 'Priorize a Acme.' }),
    });
    service = new AiService(config as never, prisma as never);
  });

  it('envia mensagens com contexto do CRM montado a partir do banco', async () => {
    const createdAt = new Date('2026-06-10T10:00:00.000Z');
    const updatedAt = new Date('2026-06-14T12:00:00.000Z');
    const nextFollowUp = new Date('2026-06-15T14:00:00.000Z');

    prisma.status.findMany.mockResolvedValue([
      {
        id: 'status-1',
        name: 'Novo',
        color: '#0ea5e9',
        order: 0,
        _count: { leads: 1 },
      },
    ]);
    prisma.lead.findMany
      .mockResolvedValueOnce([
        {
          id: 'lead-1',
          company: 'Acme Ltda',
          contactName: 'Ana',
          email: 'ana@acme.com',
          phone: '+55 11 99999-9999',
          value: 500000,
          source: 'Website',
          notes: 'Quer visitar o imovel.',
          nextFollowUp,
          createdAt,
          updatedAt,
          status: { id: 'status-1', name: 'Novo', color: '#0ea5e9' },
          imovel: {
            id: 'imovel-1',
            title: 'Casa Jardim',
            propertyType: 'Casa',
            city: 'Sao Paulo',
            state: 'SP',
            price: 500000,
            bedrooms: 3,
            bathrooms: 2,
            areaM2: 120,
            notes: 'Aceita financiamento.',
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'lead-1',
          company: 'Acme Ltda',
          contactName: 'Ana',
          email: 'ana@acme.com',
          phone: '+55 11 99999-9999',
          nextFollowUp,
          status: { name: 'Novo' },
          imovel: null,
        },
      ]);
    prisma.imovel.findMany.mockResolvedValue([
      {
        id: 'imovel-1',
        title: 'Casa Jardim',
        propertyType: 'Casa',
        address: 'Rua A',
        city: 'Sao Paulo',
        state: 'SP',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        areaM2: 120,
        notes: 'Aceita financiamento.',
        updatedAt,
      },
    ]);

    await service.chat('user-1', {
      messages: [{ role: 'user', content: 'Quais leads devo priorizar hoje?' }],
      context: 'Use linguagem objetiva.',
    });

    expect(prisma.status.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'user-1' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { leads: true } } },
    });
    expect(prisma.lead.findMany).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://ai.local/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    const context = JSON.parse(request.context);

    expect(request.messages).toEqual([
      { role: 'user', content: 'Quais leads devo priorizar hoje?' },
    ]);
    expect(context.extraContext).toBe('Use linguagem objetiva.');
    expect(context.crm.statuses).toEqual([
      {
        id: 'status-1',
        name: 'Novo',
        color: '#0ea5e9',
        order: 0,
        leadsCount: 1,
      },
    ]);
    expect(context.crm.recentLeads[0]).toMatchObject({
      id: 'lead-1',
      company: 'Acme Ltda',
      status: { name: 'Novo' },
      imovel: { title: 'Casa Jardim', price: 500000 },
    });
    expect(context.crm.upcomingContacts[0]).toMatchObject({
      id: 'lead-1',
      company: 'Acme Ltda',
      nextFollowUp: '2026-06-15T14:00:00.000Z',
    });
  });
});
