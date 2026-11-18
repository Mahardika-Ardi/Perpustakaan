import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client.js';

export const ROLES_KEY = 'roles';

/**
 * Menandai route yang butuh role tertentu:
 * `@Roles(Role.PETUGAS)` — dibaca oleh RolesGuard.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
