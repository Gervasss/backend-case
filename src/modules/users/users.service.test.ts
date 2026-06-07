import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const prisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma as never);
  });

  it('cria um usuario pelo Prisma', async () => {
    prisma.user.create.mockResolvedValue({ id: 'user-1' });

    await service.create({
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hash',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Ana',
        email: 'ana@example.com',
        passwordHash: 'hash',
      },
    });
  });

  it('mapeia violacoes de e-mail unico para uma resposta de conflito', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['email'] },
      }),
    );

    await expect(
      service.create({
        name: 'Ana',
        email: 'ana@example.com',
        passwordHash: 'hash',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
