import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
  };
  const statusesService = {
    createDefaultPipeline: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService.sign.mockReturnValue('signed-token');
    service = new AuthService(usersService as never, statusesService as never, jwtService as never);
  });

  it('registra um usuario com e-mail normalizado e cria o pipeline padrao', async () => {
    usersService.create.mockResolvedValue({
      id: 'user-1',
      email: 'ana@example.com',
      name: 'Ana',
    });
    statusesService.createDefaultPipeline.mockResolvedValue({ count: 5 });

    const result = await service.register({
      name: 'Ana',
      email: 'ANA@Example.COM',
      password: 'secret123',
    });

    expect(usersService.create).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: expect.any(String),
    });
    const [{ passwordHash }] = usersService.create.mock.calls[0];
    await expect(bcrypt.compare('secret123', passwordHash)).resolves.toBe(true);
    expect(statusesService.createDefaultPipeline).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      accessToken: 'signed-token',
      user: { id: 'user-1', email: 'ana@example.com', name: 'Ana' },
    });
  });

  it('faz login com credenciais validas', async () => {
    const passwordHash = await bcrypt.hash('secret123', 12);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ana@example.com',
      name: 'Ana',
      passwordHash,
    });

    const result = await service.login({
      email: 'ANA@Example.COM',
      password: 'secret123',
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith('ana@example.com');
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user-1', email: 'ana@example.com' });
    expect(result.accessToken).toBe('signed-token');
  });

  it('rejeita usuarios desconhecidos e senhas invalidas', async () => {
    usersService.findByEmail.mockResolvedValueOnce(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'secret123' }),
    ).rejects.toThrow(UnauthorizedException);

    usersService.findByEmail.mockResolvedValueOnce({
      id: 'user-1',
      email: 'ana@example.com',
      name: 'Ana',
      passwordHash: await bcrypt.hash('right-password', 12),
    });

    await expect(
      service.login({ email: 'ana@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
