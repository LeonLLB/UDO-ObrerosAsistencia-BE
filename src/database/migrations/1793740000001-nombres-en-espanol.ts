import {
  MigrationInterface,
  QueryRunner,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const VISTA_INTERVALOS = `
  SELECT
    intervalos.personal_id AS id_personal,
    personal.cedula AS cedula,
    personal.nombres AS nombres,
    personal.apellidos AS apellidos,
    intervalos.fecha_trabajo AS fecha_trabajo,
    intervalos.hora_entrada AS hora_entrada,
    intervalos.hora_salida AS hora_salida,
    TIMESTAMPDIFF(
      SECOND,
      intervalos.hora_entrada,
      intervalos.hora_salida
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
  ) intervalos
  INNER JOIN personal ON personal.id = intervalos.personal_id
  WHERE MOD(intervalos.numero_movimiento, 2) = 1
    AND intervalos.hora_salida IS NOT NULL
    AND intervalos.hora_salida > intervalos.hora_entrada
`;

const VISTA_INTERVALOS_ANTERIOR = `
  SELECT
    pares.personal_id AS personal_id,
    personal.cedula AS cedula,
    personal.nombres AS nombres,
    personal.apellidos AS apellidos,
    pares.fecha_trabajo AS work_date,
    pares.hora_entrada AS entry_time,
    pares.hora_salida AS exit_time,
    pares.duracion_segundos AS duration_seconds
  FROM (
    SELECT
      ordenados.personal_id,
      ordenados.work_date AS fecha_trabajo,
      ordenados.movement_time AS hora_entrada,
      LEAD(ordenados.movement_time) OVER (
        PARTITION BY ordenados.personal_id, ordenados.work_date
        ORDER BY ordenados.movement_time, ordenados.movement_id
      ) AS hora_salida,
      ROW_NUMBER() OVER (
        PARTITION BY ordenados.personal_id, ordenados.work_date
        ORDER BY ordenados.movement_time, ordenados.movement_id
      ) AS numero_movimiento,
      TIMESTAMPDIFF(
        SECOND,
        ordenados.movement_time,
        LEAD(ordenados.movement_time) OVER (
          PARTITION BY ordenados.personal_id, ordenados.work_date
          ORDER BY ordenados.movement_time, ordenados.movement_id
        )
      ) AS duracion_segundos
    FROM (
      SELECT
        movimiento.personal_id,
        DATE(movimiento.timestamp) AS work_date,
        movimiento.timestamp AS movement_time,
        movimiento.id AS movement_id
      FROM a2d_movements movimiento
      WHERE movimiento.personal_id IS NOT NULL
        AND movimiento.status = 1
        AND movimiento.minor = 38
    ) ordenados
  ) pares
  INNER JOIN personal ON personal.id = pares.personal_id
  WHERE MOD(pares.numero_movimiento, 2) = 1
    AND pares.hora_salida IS NOT NULL
    AND pares.hora_salida > pares.hora_entrada
`;

export class MigracionNombresEnEspanol1793740000001 implements MigrationInterface {
  name = 'MigracionNombresEnEspanol1793740000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.eliminarVistas(queryRunner);
    await this.renombrarEsquema(queryRunner, true);
    await this.crearVistasEnEspanol(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.eliminarVistas(queryRunner);
    await this.renombrarEsquema(queryRunner, false);
    await queryRunner.query(`
      CREATE OR REPLACE VIEW personal_daily_attendance_intervals AS
      ${VISTA_INTERVALOS_ANTERIOR}
    `);
    await queryRunner.query(`
      CREATE OR REPLACE VIEW personal_daily_attendance_summary AS
      SELECT
        personal_id,
        cedula,
        nombres,
        apellidos,
        work_date,
        SUM(duration_seconds) AS duration_seconds,
        SUM(duration_seconds) / 3600.0 AS worked_hours
      FROM personal_daily_attendance_intervals
      GROUP BY personal_id, cedula, nombres, apellidos, work_date
    `);
  }

  private async eliminarVistas(queryRunner: QueryRunner): Promise<void> {
    for (const vista of [
      'vista_resumen_asistencia_diaria',
      'vista_intervalos_asistencia_diaria',
      'personal_daily_attendance_summary',
      'personal_daily_attendance_intervals',
      'personal_asistencias_diarias_resumen',
      'personal_asistencias_diarias_intervalos',
    ]) {
      await queryRunner.query(`DROP VIEW IF EXISTS \`${vista}\``);
    }
  }

  private async renombrarEsquema(
    queryRunner: QueryRunner,
    aEspanol: boolean,
  ): Promise<void> {
    const nombreTablaAnterior = aEspanol ? 'a2d_movements' : 'movimientos_a2d';
    const nombreTablaNuevo = aEspanol ? 'movimientos_a2d' : 'a2d_movements';
    const tablaAnteriorExiste = await queryRunner.hasTable(nombreTablaAnterior);
    const tablaNuevaExiste = await queryRunner.hasTable(nombreTablaNuevo);

    if (tablaAnteriorExiste && tablaNuevaExiste) {
      throw new Error(
        `No se puede renombrar ${nombreTablaAnterior}: también existe ${nombreTablaNuevo}`,
      );
    }
    if (!tablaAnteriorExiste && !tablaNuevaExiste) {
      throw new Error(
        `No existe la tabla de movimientos ${nombreTablaAnterior} ni ${nombreTablaNuevo}`,
      );
    }

    const tablaMovimientos = tablaNuevaExiste
      ? nombreTablaNuevo
      : nombreTablaAnterior;
    await this.eliminarClavesForaneas(
      queryRunner,
      tablaMovimientos,
      aEspanol ? ['FK_a2d_movement_personal'] : ['FK_movimientos_a2d_personal'],
    );
    await this.eliminarClavesForaneas(
      queryRunner,
      'personal',
      aEspanol ? ['FK_personal_area'] : ['FK_personal_area_encargada'],
    );
    await this.eliminarIndices(
      queryRunner,
      tablaMovimientos,
      aEspanol
        ? [
            'UQ_a2d_movement_user_timestamp_minor',
            'UQ_a2d_movement_user_timestamp',
          ]
        : ['UQ_movimientos_a2d_usuario_fecha_hora_codigo_menor'],
    );

    const columnasMovimientos = aEspanol
      ? [
          ['user', 'usuario'],
          ['timestamp', 'fecha_hora'],
          ['minor', 'codigo_menor'],
          ['status', 'estado'],
        ]
      : [
          ['usuario', 'user'],
          ['fecha_hora', 'timestamp'],
          ['codigo_menor', 'minor'],
          ['estado', 'status'],
        ];
    for (const [columnaAnterior, columnaNueva] of columnasMovimientos) {
      await this.renombrarColumnaSiExiste(
        queryRunner,
        tablaMovimientos,
        columnaAnterior,
        columnaNueva,
      );
    }

    if (tablaMovimientos === nombreTablaAnterior) {
      await queryRunner.renameTable(tablaMovimientos, nombreTablaNuevo);
    }

    const columnasPersonal = aEspanol
      ? [
          ['fechaIngreso', 'fecha_ingreso'],
          ['status', 'estado'],
          ['areaEncargadaId', 'area_encargada_id'],
        ]
      : [
          ['fecha_ingreso', 'fechaIngreso'],
          ['estado', 'status'],
          ['area_encargada_id', 'areaEncargadaId'],
        ];
    for (const [columnaAnterior, columnaNueva] of columnasPersonal) {
      await this.renombrarColumnaSiExiste(
        queryRunner,
        'personal',
        columnaAnterior,
        columnaNueva,
      );
    }

    const indiceUnico = new TableIndex({
      name: aEspanol
        ? 'UQ_movimientos_a2d_usuario_fecha_hora_codigo_menor'
        : 'UQ_a2d_movement_user_timestamp_minor',
      columnNames: aEspanol
        ? ['usuario', 'fecha_hora', 'codigo_menor']
        : ['user', 'timestamp', 'minor'],
      isUnique: true,
    });
    await queryRunner.createIndex(nombreTablaNuevo, indiceUnico);

    await queryRunner.createForeignKey(
      nombreTablaNuevo,
      new TableForeignKey({
        name: aEspanol
          ? 'FK_movimientos_a2d_personal'
          : 'FK_a2d_movement_personal',
        columnNames: ['personal_id'],
        referencedTableName: 'personal',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
    await queryRunner.createForeignKey(
      'personal',
      new TableForeignKey({
        name: aEspanol ? 'FK_personal_area_encargada' : 'FK_personal_area',
        columnNames: [aEspanol ? 'area_encargada_id' : 'areaEncargadaId'],
        referencedTableName: 'areas',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  private async eliminarClavesForaneas(
    queryRunner: QueryRunner,
    tabla: string,
    nombres: string[],
  ): Promise<void> {
    const definicion = await queryRunner.getTable(tabla);
    for (const nombre of nombres) {
      const clave = definicion?.foreignKeys.find(
        (foreignKey) => foreignKey.name === nombre,
      );
      if (clave) {
        await queryRunner.dropForeignKey(tabla, clave);
      }
    }
  }

  private async eliminarIndices(
    queryRunner: QueryRunner,
    tabla: string,
    nombres: string[],
  ): Promise<void> {
    const definicion = await queryRunner.getTable(tabla);
    for (const nombre of nombres) {
      const indice = definicion?.indices.find((index) => index.name === nombre);
      if (indice) {
        await queryRunner.dropIndex(tabla, indice);
      }
    }
  }

  private async renombrarColumnaSiExiste(
    queryRunner: QueryRunner,
    tabla: string,
    anterior: string,
    nueva: string,
  ): Promise<void> {
    const tablaActual = await queryRunner.getTable(tabla);
    if (
      tablaActual?.findColumnByName(anterior) &&
      !tablaActual.findColumnByName(nueva)
    ) {
      await queryRunner.renameColumn(tabla, anterior, nueva);
    }
  }

  private async crearVistasEnEspanol(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE OR REPLACE VIEW vista_intervalos_asistencia_diaria AS ' +
        VISTA_INTERVALOS,
    );
    await queryRunner.query(`
      CREATE OR REPLACE VIEW vista_resumen_asistencia_diaria AS
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
    `);
  }
}
