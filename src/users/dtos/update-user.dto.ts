import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TipoUsuario } from '../tipo-usuario';

export class ActualizarUsuarioDto {

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,20}$/)
  cedula?: string;
  

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellidos?: string;

  @IsOptional()
  @IsEnum(TipoUsuario)
  tipo?: TipoUsuario;
}
