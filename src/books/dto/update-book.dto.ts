import { PartialType } from '@nestjs/mapped-types';
import { CreateBookDto } from './create-book.dto.js';

/** Semua field jadi opsional — dipakai oleh `PATCH /books/:id`. */
export class UpdateBookDto extends PartialType(CreateBookDto) {}
