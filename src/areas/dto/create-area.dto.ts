import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearAreaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre!: string;
}
