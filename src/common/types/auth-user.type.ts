import type { Role } from '../../generated/prisma/client.js';

/**
 * Payload JWT yang menempel di `request.user` setelah JwtAuthGuard lolos.
 * `sub` = id User.
 */
export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
}
