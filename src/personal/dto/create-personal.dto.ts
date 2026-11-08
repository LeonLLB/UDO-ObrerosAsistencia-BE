import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum TipoPersonal {
  ADMINISTRATIVO = 'A',
  OBRERO = 'O',
}

export class CrearPersonalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cedula!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellidos!: string;

  @IsDateString({ strict: true })
  fechaIngreso!: string;

  @IsOptional()
  @IsIn(Object.values(TipoPersonal))
  tipo?: TipoPersonal;

  @IsOptional()
  @IsIn([0, 1])
  status?: 0 | 1;

  @IsInt()
  idAreaEncargada!: number;
}
