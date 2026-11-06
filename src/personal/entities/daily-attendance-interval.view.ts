import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  name: 'vista_intervalos_asistencia_diaria',
  expression: `
    SELECT
      emparejados.personal_id AS id_personal,
      personal.cedula AS cedula,
      personal.nombres AS nombres,
      personal.apellidos AS apellidos,
      emparejados.fecha_trabajo AS fecha_trabajo,
      emparejados.hora_entrada AS hora_entrada,
      emparejados.hora_salida AS hora_salida,
      TIMESTAMPDIFF(
        SECOND,
        emparejados.hora_entrada,
        emparejados.hora_salida
      ) AS duracion_segundos
    FROM (
      SELECT
        ordenados.personal_id,
        ordenados.fecha_trabajo,
        ordenados.momento AS hora_entrada,
        LEAD(ordenados.momento) OVER (
          PARTITION BY ordenados.personal_id, ordenados.fecha_trabajo
          ORDER BY ordenados.momento, ordenados.id_movimiento
        ) AS hora_salida,
        ROW_NUMBER() OVER (
          PARTITION BY ordenados.personal_id, ordenados.fecha_trabajo
          ORDER BY ordenados.momento, ordenados.id_movimiento
        ) AS numero_movimiento
      FROM (
        SELECT
          movimiento.personal_id,
          DATE(movimiento.fecha_hora) AS fecha_trabajo,
          movimiento.fecha_hora AS momento,
          movimiento.id AS id_movimiento
        FROM movimientos_a2d movimiento
        WHERE movimiento.personal_id IS NOT NULL
          AND movimiento.estado = 1
          AND movimiento.codigo_menor = 38
      ) ordenados
    ) emparejados
    INNER JOIN personal ON personal.id = emparejados.personal_id
    WHERE MOD(emparejados.numero_movimiento, 2) = 1
      AND emparejados.hora_salida IS NOT NULL
      AND emparejados.hora_salida > emparejados.hora_entrada
  `,
})
export class VistaIntervalosAsistenciaDiaria {
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

  @ViewColumn({ name: 'hora_entrada' })
  horaEntrada!: Date;

  @ViewColumn({ name: 'hora_salida' })
  horaSalida!: Date;

  @ViewColumn({ name: 'duracion_segundos' })
  duracionSegundos!: number;
}
