import { Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

function convertirANumero(valor: unknown): unknown {
  if (typeof valor === 'string' || typeof valor === 'number') {
    return Number(valor);
  }
  return valor;
}

function normalizarNumeroEmpleado(valor: unknown): unknown {
  return typeof valor === 'string' || typeof valor === 'number'
    ? String(valor)
    : valor;
}

export class EventoDispositivoDto {
  @Expose({ name: 'employeeNoString' })
  @IsOptional()
  @IsString()
  numeroEmpleadoTexto?: string;

  @Expose({ name: 'employeeNo' })
  @IsOptional()
  @Transform(({ value }) => normalizarNumeroEmpleado(value))
  @IsString()
  numeroEmpleado?: string;

  @Expose({ name: 'time' })
  @IsOptional()
  @IsDateString()
  fechaHora?: string;

  @Expose({ name: 'minor' })
  @IsOptional()
  @Transform(({ value }) => convertirANumero(value))
  @IsInt()
  codigoMenor?: number;
}

export class RespuestaEventoAccesoDispositivoDto {
  @Expose({ name: 'responseStatusStrg' })
  @IsOptional()
  @IsString()
  estadoRespuestaExtendido?: string;

  @Expose({ name: 'responseStatusStr' })
  @IsOptional()
  @IsString()
  estadoRespuesta?: string;

  @Expose({ name: 'InfoList' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventoDispositivoDto)
  listaInformacion?: EventoDispositivoDto[];
}

export class RespuestaEventosDispositivoDto {
  @Expose({ name: 'AcsEvent' })
  @IsDefined()
  @ValidateNested()
  @Type(() => RespuestaEventoAccesoDispositivoDto)
  eventoAcceso: RespuestaEventoAccesoDispositivoDto;
}
