import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  name: 'vista_resumen_asistencia_diaria',
  expression: `
    SELECT
      id_personal,
      cedula,
      nombres,
      apellidos,
      fecha_trabajo,
      SUM(duracion_segundos) AS duracion_segundos,
      SUM(duracion_segundos) / 3600.0 AS horas_trabajadas
    FROM vista_intervalos_asistencia_diaria
    GROUP BY id_personal, cedula, nombres, apellidos, fecha_trabajo
  `,
})
export class VistaResumenAsistenciaDiaria {
  @ViewColumn({ name: 'id_personal' })
  idPersonal!: number;

  @ViewColumn()
  cedula!: string;

  @ViewColumn()
  nombres!: string;

  @ViewColumn()
  apellidos!: string;

  @ViewColumn({ name: 'fecha_trabajo' })
  fechaTrabajo!: string;

  @ViewColumn({ name: 'duracion_segundos' })
  duracionSegundos!: number;

  @ViewColumn({ name: 'horas_trabajadas' })
  horasTrabajadas!: number;
}
