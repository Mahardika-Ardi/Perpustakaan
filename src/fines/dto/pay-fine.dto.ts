import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Input pelunasan denda — bisa dikosongkan (status cukup dari parameter route). */
export class PayFineDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
