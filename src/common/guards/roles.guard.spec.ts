import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  const createContext = (user?: { sub: string; email: string; role: string }) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as unknown as ExecutionContext;

  const createGuard = (roles: string[] | null) => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(roles),
    } as unknown as Reflector;

    return new RolesGuard(reflector);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lolos bila route tidak punya @Roles (cukup sudah login)', () => {
    const guard = createGuard(null);

    expect(guard.canActivate(createContext(undefined))).toBe(true);
  });

  it('lolos bila role user termasuk yang diminta', () => {
    const guard = createGuard(['PETUGAS']);

    expect(
      guard.canActivate(
        createContext({ sub: '1', email: 'p@x.id', role: 'PETUGAS' }),
      ),
    ).toBe(true);
  });

  it('melempar 403 bila role user tidak memenuhi', () => {
    const guard = createGuard(['PETUGAS']);

    expect(() =>
      guard.canActivate(
        createContext({ sub: '2', email: 'a@x.id', role: 'ANGGOTA' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('melempar 403 bila request tanpa user (guard auth belum jalan)', () => {
    const guard = createGuard(['PETUGAS']);

    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
