import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthUser } from '../types/auth-user.type.js';

/**
 * Membaca header `Authorization: Bearer <token>`, memverifikasi JWT,
 * lalu menempelkan payload-nya di `request.user`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Token tidak ditemukan');
    }

    try {
      request.user = this.jwtService.verify<AuthUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token tidak valid atau kedaluwarsa');
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = (request.headers.authorization ?? '').split(' ');
    return type === 'Bearer' && token ? token : undefined;
  }
}
