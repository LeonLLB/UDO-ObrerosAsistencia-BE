import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TipoUsuario } from '../tipo-usuario';

export class CrearUsuarioDto {
  @IsString()
  @Matches(/^\d{1,20}$/)
  cedula!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellidos!: string;

  @IsEnum(TipoUsuario)
  tipo!: TipoUsuario;

}
