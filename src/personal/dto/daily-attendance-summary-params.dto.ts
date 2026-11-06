import { IsDateString } from 'class-validator';

export class ParametrosResumenAsistenciaDiariaDto {
  @IsDateString({ strict: true })
  fecha!: string;
}
