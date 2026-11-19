import { PartialType } from '@nestjs/mapped-types';
import { CreateMemberDto } from './create-member.dto.js';

/** Semua field jadi opsional — dipakai oleh `PATCH /members/:id`. */
export class UpdateMemberDto extends PartialType(CreateMemberDto) {}
