import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user.type.js';

/**
 * Mengambil `request.user` (hasil verifikasi JwtAuthGuard) sebagai parameter:
 * `me(@CurrentUser() user: AuthUser)`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
