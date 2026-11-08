import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarAreaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre?: string;
}
