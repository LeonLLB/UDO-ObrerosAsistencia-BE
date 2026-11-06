import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

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
  @IsIn([0, 1])
  estado?: number;

  @IsOptional()
  @IsInt()
  idAreaEncargada?: number;
}
