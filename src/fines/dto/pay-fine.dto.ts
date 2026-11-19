import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Input pelunasan denda — bisa dikosongkan (status cukup dari parameter route). */
export class PayFineDto {
  @ApiPropertyOptional({
    example: 'Dibayar tunai di loket perpustakaan',
    description: 'Catatan pelunasan (opsional)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
