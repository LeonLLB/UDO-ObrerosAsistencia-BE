import { Type } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';

export class ParametrosAsistenciaDiariaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;

  @IsDateString({ strict: true })
  fecha!: string;
}
