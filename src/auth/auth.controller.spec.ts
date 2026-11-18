import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ROLES_KEY } from '../common/decorators/roles.decorator.js';
import type { AuthUser } from '../common/types/auth-user.type.js';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    register: vi.fn(),
    login: vi.fn(),
    me: vi.fn(),
  };

  // @UseGuards(JwtAuthGuard) di endpoint me butuh JwtService di testing module
  const jwtServiceMock = { verify: vi.fn(), signAsync: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('harus terdaftar (bisa diinstansiasi)', () => {
    expect(controller).toBeDefined();
  });

  it('register meneruskan DTO ke service', async () => {
    const dto = {
      email: 'a@b.id',
      password: 'rahasia123',
      name: 'A',
      phone: '0812',
    } as never;
    const result = {
      user: { id: 'u1' },
      member: { id: 'm1', code: 'AGT-0001' },
    };
    authServiceMock.register.mockResolvedValue(result);

    await expect(controller.register(dto)).resolves.toEqual(result);
    expect(authServiceMock.register).toHaveBeenCalledWith(dto);
  });

  it('login meneruskan DTO ke service', async () => {
    const dto = { email: 'a@b.id', password: 'rahasia123' } as never;
    const result = { accessToken: 'token', user: { id: 'u1' } };
    authServiceMock.login.mockResolvedValue(result);

    await expect(controller.login(dto)).resolves.toEqual(result);
    expect(authServiceMock.login).toHaveBeenCalledWith(dto);
  });

  it('me meneruskan user.sub (bukan seluruh payload) ke service', async () => {
    const user: AuthUser = {
      sub: 'user-id-1',
      email: 'a@b.id',
      role: 'ANGGOTA',
    };
    const profile = { id: user.sub, email: user.email };
    authServiceMock.me.mockResolvedValue(profile);

    await expect(controller.me(user)).resolves.toEqual(profile);
    expect(authServiceMock.me).toHaveBeenCalledWith('user-id-1');
  });

  it('tidak ada @Roles di endpoint auth (register/login publik, me cukup login)', () => {
    const reflector = new Reflector();

    expect(
      reflector.get(ROLES_KEY, AuthController.prototype.register),
    ).toBeUndefined();
    expect(
      reflector.get(ROLES_KEY, AuthController.prototype.login),
    ).toBeUndefined();
    expect(
      reflector.get(ROLES_KEY, AuthController.prototype.me),
    ).toBeUndefined();
  });
});
