import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoPersonal } from './create-personal.dto';

export class ActualizarPersonalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  cedula?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombres?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  apellidos?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  fechaIngreso?: string;

  @IsOptional()
  @IsIn(Object.values(TipoPersonal))
  tipo?: TipoPersonal;

  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1;

  @IsOptional()
  @IsInt()
  idAreaEncargada?: number;
}
