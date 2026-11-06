import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^\d{1,20}$/)
  cedula!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  clave!: string;
}
