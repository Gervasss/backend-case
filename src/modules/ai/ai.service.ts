import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Imovel, Lead, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatDto } from './dto/chat.dto';

type LeadWithRelations = Lead & {
  status: Status;
  imovel: Imovel | null;
};

@Injectable()
export class AiService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async chat(userId: string, dto: ChatDto) {
    const baseUrl = this.config.get<string>('AI_SERVICE_URL') ?? 'http://localhost:8000';

    // O frontend envia a conversa; o backend enriquece com dados do CRM do usuário.
    const context = await this.buildCrmContext(userId, dto.context, dto.messages);

    try {
      // O microservico de IA recebe mensagens em separado e o contexto serializado em JSON.
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          messages: dto.messages,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with ${response.status}`);
      }

      return response.json() as Promise<unknown>;
    } catch (error) {
      throw new BadGatewayException({
        message: 'AI service is unavailable.',
        detail: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async buildCrmContext(userId: string, extraContext?: string, messages: ChatDto['messages'] = []) {
    const now = new Date();

    // Buscas independentes rodam em paralelo para montar um retrato compacto do CRM.
    const [statuses, recentLeads, upcomingContacts, imoveis] = await Promise.all([
      this.prisma.status.findMany({
        where: { ownerId: userId },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: { _count: { select: { leads: true } } },
      }),
      this.prisma.lead.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        include: { status: true, imovel: true },
      }),
      this.prisma.lead.findMany({
        where: {
          ownerId: userId,
          nextFollowUp: { gte: now },
        },
        orderBy: { nextFollowUp: 'asc' },
        take: 15,
        include: { status: true, imovel: true },
      }),
      this.prisma.imovel.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
    ]);

    // Recorte por termos da pergunta: ajuda a IA a focar no lead/imóvel citado pelo usuário.
    const matchedContext = await this.buildMatchedContext(userId, messages, recentLeads, imoveis);

    return JSON.stringify({
      generatedAt: now.toISOString(),
      instructions:
        'Use somente os dados deste contexto do CRM para responder. Quando faltarem dados, diga que a informação não está cadastrada. Quando matchedCrm existir, use esse recorte como prioridade para resolver cliente e imóvel citados na conversa.',
      extraContext,
      matchedCrm: matchedContext,
      crm: {
        totals: {
          statuses: statuses.length,
          leads: recentLeads.length,
          upcomingContacts: upcomingContacts.length,
          imoveis: imoveis.length,
        },
        // Lista geral para respostas amplas: pipeline, contagens, funil e organização.
        statuses: statuses.map((status) => ({
          id: status.id,
          name: status.name,
          color: status.color,
          order: status.order,
          leadsCount: status._count.leads,
        })),
        // Leads recentes carregam status e imóvel para a IA conseguir responder perguntas do CRM.
        recentLeads: recentLeads.map((lead) => ({
          id: lead.id,
          company: lead.company,
          contactName: lead.contactName,
          email: lead.email,
          phone: lead.phone,
          value: lead.value,
          source: lead.source,
          notes: lead.notes,
          nextFollowUp: this.formatDate(lead.nextFollowUp),
          createdAt: lead.createdAt.toISOString(),
          updatedAt: lead.updatedAt.toISOString(),
          status: {
            id: lead.status.id,
            name: lead.status.name,
            color: lead.status.color,
          },
          imovel: lead.imovel
            ? {
                id: lead.imovel.id,
                title: lead.imovel.title,
                propertyType: lead.imovel.propertyType,
                city: lead.imovel.city,
                state: lead.imovel.state,
                price: lead.imovel.price,
                bedrooms: lead.imovel.bedrooms,
                bathrooms: lead.imovel.bathrooms,
                areaM2: lead.imovel.areaM2,
                notes: lead.imovel.notes,
            }
            : null,
        })),
        // Agenda curta baseada em nextFollowUp, usada para priorização e próximas ações.
        upcomingContacts: upcomingContacts.map((lead) => ({
          id: lead.id,
          company: lead.company,
          contactName: lead.contactName,
          phone: lead.phone,
          email: lead.email,
          nextFollowUp: this.formatDate(lead.nextFollowUp),
          status: lead.status.name,
        })),
        // Catálogo resumido de imóveis, separado dos leads, para buscas e comparações.
        imoveis: imoveis.map((imovel) => ({
          id: imovel.id,
          title: imovel.title,
          propertyType: imovel.propertyType,
          address: imovel.address,
          city: imovel.city,
          state: imovel.state,
          price: imovel.price,
          bedrooms: imovel.bedrooms,
          bathrooms: imovel.bathrooms,
          areaM2: imovel.areaM2,
          notes: imovel.notes,
          updatedAt: imovel.updatedAt.toISOString(),
        })),
        unavailableData: ['tarefas', 'histórico dedicado de interações'],
      },
    });
  }

  private async buildMatchedContext(
    userId: string,
    messages: ChatDto['messages'],
    leads: LeadWithRelations[],
    imoveis: Imovel[],
  ) {
    // Usa apenas as últimas mensagens do usuário para evitar que conversas longas poluam a busca.
    const text = messages
      .filter((message) => message.role === 'user')
      .slice(-4)
      .map((message) => message.content)
      .join(' ');
    const terms = this.extractSearchTerms(text);

    if (!terms.length) {
      return null;
    }

    const directMatches = await this.findLeadsByTerms(userId, terms);
    const candidateLeads = this.uniqueLeads([...directMatches, ...leads]);

    // Primeiro encontra imoveis que batem com os termos citados na conversa.
    const matchedImoveis = imoveis.filter((imovel) =>
      this.includesAnyTerm(
        [
          imovel.title,
          imovel.propertyType,
          imovel.address,
          imovel.city,
          imovel.state,
          imovel.notes,
        ].join(' '),
        terms,
      ),
    );
    const matchedImovelIds = new Set(matchedImoveis.map((imovel) => imovel.id));
    const matchedImovelTitles = new Set(
      matchedImoveis.map((imovel) => this.normalizeText(imovel.title)),
    );

    // Depois ranqueia leads por contato, imóvel relacionado e termos gerais do lead.
    const matchedLeads = candidateLeads
      .map((lead) => {
        const leadText = [
          lead.contactName,
          lead.company,
          lead.email,
          lead.phone,
          lead.source,
          lead.notes,
          lead.status.name,
          lead.imovel?.title,
          lead.imovel?.propertyType,
          lead.imovel?.address,
          lead.imovel?.city,
        ].join(' ');
        const imovelText = [
          lead.imovel?.title,
          lead.imovel?.propertyType,
          lead.imovel?.address,
          lead.imovel?.city,
          lead.imovel?.state,
        ].join(' ');
        const contactText = [lead.contactName, lead.company].join(' ');
        const matchedByImovel =
          Boolean(lead.imovelId && matchedImovelIds.has(lead.imovelId)) ||
          matchedImovelTitles.has(this.normalizeText(lead.company));
        const score =
          this.countMatchingTerms(contactText, terms) * 3 +
          this.countMatchingTerms(imovelText, terms) * 3 +
          this.countMatchingTerms(leadText, terms) +
          (matchedByImovel ? 4 : 0);

        return { lead, score };
      })
      .filter((item) => item.score > 0)
      .sort((first, second) => second.score - first.score)
      .map((item) => item.lead);

    return {
      instructions: [
        'Use estes candidatos como recorte prioritario da conversa atual.',
        'Se houver um lead com contactName e imóvel compatíveis com a pergunta, responda sobre esse lead sem pedir nova confirmação.',
        'Não diga que status, valor, follow-up ou notas estão ausentes quando esses campos aparecem neste recorte.',
      ],
      searchTerms: terms,
      leads: matchedLeads.slice(0, 8).map((lead) => this.toLeadContext(lead)),
      imoveis: matchedImoveis.slice(0, 8).map((imovel) => this.toImovelContext(imovel)),
    };
  }

  private async findLeadsByTerms(userId: string, terms: string[]) {
    const directMatches = await this.prisma.lead.findMany({
      where: {
        ownerId: userId,
        OR: terms.flatMap((term) => [
          { contactName: { contains: term, mode: 'insensitive' as const } },
          { company: { contains: term, mode: 'insensitive' as const } },
          { email: { contains: term, mode: 'insensitive' as const } },
          { phone: { contains: term, mode: 'insensitive' as const } },
          { source: { contains: term, mode: 'insensitive' as const } },
          { notes: { contains: term, mode: 'insensitive' as const } },
          { status: { name: { contains: term, mode: 'insensitive' as const } } },
          {
            imovel: {
              is: {
                OR: [
                  { title: { contains: term, mode: 'insensitive' as const } },
                  { propertyType: { contains: term, mode: 'insensitive' as const } },
                  { address: { contains: term, mode: 'insensitive' as const } },
                  { city: { contains: term, mode: 'insensitive' as const } },
                  { state: { contains: term, mode: 'insensitive' as const } },
                  { notes: { contains: term, mode: 'insensitive' as const } },
                ],
              },
            },
          },
        ]),
      },
      include: { status: true, imovel: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const broadCandidates = await this.prisma.lead.findMany({
      where: { ownerId: userId },
      include: { status: true, imovel: true },
      orderBy: { updatedAt: 'desc' },
      take: 250,
    });

    const normalizedMatches = broadCandidates.filter((lead) =>
      this.includesAnyTerm(
        [
          lead.contactName,
          lead.company,
          lead.email,
          lead.phone,
          lead.source,
          lead.notes,
          lead.status.name,
          lead.imovel?.title,
          lead.imovel?.propertyType,
          lead.imovel?.address,
          lead.imovel?.city,
          lead.imovel?.state,
          lead.imovel?.notes,
        ].join(' '),
        terms,
      ),
    );

    return this.uniqueLeads([...directMatches, ...normalizedMatches]).slice(0, 20);
  }

  private uniqueLeads(leads: LeadWithRelations[]) {
    const seen = new Set<string>();
    return leads.filter((lead) => {
      if (seen.has(lead.id)) {
        return false;
      }

      seen.add(lead.id);
      return true;
    });
  }

  private extractSearchTerms(text: string) {
    // Remove palavras muito genéricas para os termos restantes funcionarem como pistas reais.
    const ignored = new Set([
      'apartamento',
      'cliente',
      'clientes',
      'imovel',
      'imoveis',
      'lead',
      'leads',
      'passo',
      'passos',
      'proximo',
      'quais',
      'quero',
      'saber',
      'status',
      'tomar',
    ]);
    const normalized = this.normalizeText(text);
    const quotedTerms = [...normalized.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    const plainTerms = normalized
      .split(/[^a-z0-9]+/i)
      .filter((term) => term.length >= 3 && !ignored.has(term));

    return [...new Set([...quotedTerms, ...plainTerms])].slice(0, 12);
  }

  private includesAnyTerm(value: string, terms: string[]) {
    // Comparação normalizada para ignorar acentos e diferença de maiúsculas/minúsculas.
    const normalized = this.normalizeText(value);
    return terms.some((term) => normalized.includes(term));
  }

  private countMatchingTerms(value: string, terms: string[]) {
    const normalized = this.normalizeText(value);
    return terms.reduce((total, term) => total + (normalized.includes(term) ? 1 : 0), 0);
  }

  private normalizeText(value?: string | null) {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private toLeadContext(lead: LeadWithRelations) {
    return {
      id: lead.id,
      company: lead.company,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      value: lead.value,
      source: lead.source,
      notes: lead.notes,
      nextFollowUp: this.formatDate(lead.nextFollowUp),
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      status: {
        id: lead.status.id,
        name: lead.status.name,
        color: lead.status.color,
        order: lead.status.order,
      },
      imovel: lead.imovel ? this.toImovelContext(lead.imovel) : null,
    };
  }

  private toImovelContext(imovel: Imovel) {
    return {
      id: imovel.id,
      title: imovel.title,
      propertyType: imovel.propertyType,
      address: imovel.address,
      city: imovel.city,
      state: imovel.state,
      price: imovel.price,
      bedrooms: imovel.bedrooms,
      bathrooms: imovel.bathrooms,
      areaM2: imovel.areaM2,
      notes: imovel.notes,
      updatedAt: imovel.updatedAt.toISOString(),
    };
  }

  private formatDate(value?: Date | null) {
    if (!value) {
      return null;
    }

    const day = String(value.getUTCDate()).padStart(2, '0');
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const year = value.getUTCFullYear();

    return `${day}/${month}/${year}`;
  }
}
