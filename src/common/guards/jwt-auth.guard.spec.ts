import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const jwtMock = { verify: vi.fn() };

  const createContext = (authorization?: string) => {
    const request: { headers: Record<string, string>; user?: unknown } = {
      headers: authorization ? { authorization } : {},
    };

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    return { request, context };
  };

  beforeEach(() => {
    vi.resetAllMocks();
    guard = new JwtAuthGuard(jwtMock as unknown as JwtService);
  });

  it('menolak bila header Authorization tidak ada', () => {
    const { context } = createContext();

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(jwtMock.verify).not.toHaveBeenCalled();
  });

  it('menolak bila skema bukan Bearer', () => {
    const { context } = createContext('Basic dXNlcjpwYXNz');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('menolak bila token tidak valid (verify melempar error)', () => {
    jwtMock.verify.mockImplementation(() => {
      throw new Error('jwt malformed');
    });
    const { context } = createContext('Bearer token-rusak');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('lolos: menempelkan payload JWT di request.user', () => {
    const payload = { sub: 'user-1', email: 'a@b.id', role: 'PETUGAS' };
    jwtMock.verify.mockReturnValue(payload);

    const { request, context } = createContext('Bearer token-bagus');

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual(payload);
  });
});
