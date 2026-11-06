import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const ATTENDANCE_VIEW = `
  SELECT
    paired.personal_id AS personal_id,
    paired.work_date AS work_date,
    paired.entry_time AS entry_time,
    paired.exit_time AS exit_time,
    TIMESTAMPDIFF(SECOND, paired.entry_time, paired.exit_time) AS duration_seconds
  FROM (
    SELECT
      ordered.personal_id,
      ordered.work_date,
      ordered.movement_time AS entry_time,
      LEAD(ordered.movement_time) OVER (
        PARTITION BY ordered.personal_id, ordered.work_date
        ORDER BY ordered.movement_time, ordered.movement_id
      ) AS exit_time,
      ROW_NUMBER() OVER (
        PARTITION BY ordered.personal_id, ordered.work_date
        ORDER BY ordered.movement_time, ordered.movement_id
      ) AS movement_number
    FROM (
      SELECT
        movement.personal_id,
        DATE(movement.timestamp) AS work_date,
        movement.timestamp AS movement_time,
        movement.id AS movement_id
      FROM a2d_movements movement
      WHERE movement.personal_id IS NOT NULL
        AND movement.status = 1
        AND movement.minor = 38
    ) ordered
  ) paired
  WHERE MOD(paired.movement_number, 2) = 1
    AND paired.exit_time IS NOT NULL
    AND paired.exit_time > paired.entry_time
`;

export class PersonalAttendance1730676000000 implements MigrationInterface {
  name = 'PersonalAttendance1730676000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('areas'))) {
      await queryRunner.createTable(
        new Table({
          name: 'areas',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'nombre', type: 'varchar', length: '120', isUnique: true },
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('personal'))) {
      await queryRunner.createTable(
        new Table({
          name: 'personal',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'cedula', type: 'varchar', length: '20', isUnique: true },
            { name: 'nombres', type: 'varchar', length: '100' },
            { name: 'apellidos', type: 'varchar', length: '100' },
            { name: 'fechaIngreso', type: 'date' },
            { name: 'status', type: 'tinyint', default: 1 },
            { name: 'areaEncargadaId', type: 'int' },
          ],
          foreignKeys: [
            new TableForeignKey({
              name: 'FK_personal_area',
              columnNames: ['areaEncargadaId'],
              referencedTableName: 'areas',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            }),
          ],
        }),
      );
    }

    const personalTable = await queryRunner.getTable('personal');
    const hasAreaForeignKey = personalTable?.foreignKeys.some(
      (foreignKey) => foreignKey.name === 'FK_personal_area',
    );
    if (!hasAreaForeignKey) {
      await queryRunner.createForeignKey(
        'personal',
        new TableForeignKey({
          name: 'FK_personal_area',
          columnNames: ['areaEncargadaId'],
          referencedTableName: 'areas',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
      );
    }

    if (!(await queryRunner.hasTable('a2d_movements'))) {
      await queryRunner.createTable(
        new Table({
          name: 'a2d_movements',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'user', type: 'varchar', length: '64' },
            { name: 'timestamp', type: 'datetime' },
            { name: 'minor', type: 'int', default: 0 },
            { name: 'status', type: 'tinyint', default: 1 },
            { name: 'personal_id', type: 'int', isNullable: true },
          ],
          indices: [
            new TableIndex({
              name: 'UQ_a2d_movement_user_timestamp_minor',
              columnNames: ['user', 'timestamp', 'minor'],
              isUnique: true,
            }),
          ],
          foreignKeys: [
            new TableForeignKey({
              name: 'FK_a2d_movement_personal',
              columnNames: ['personal_id'],
              referencedTableName: 'personal',
              referencedColumnNames: ['id'],
              onDelete: 'SET NULL',
            }),
          ],
        }),
      );
    } else {
      if (!(await queryRunner.hasColumn('a2d_movements', 'minor'))) {
        await queryRunner.addColumn(
          'a2d_movements',
          new TableColumn({ name: 'minor', type: 'int', default: 0 }),
        );
      }

      if (!(await queryRunner.hasColumn('a2d_movements', 'personal_id'))) {
        await queryRunner.addColumn(
          'a2d_movements',
          new TableColumn({
            name: 'personal_id',
            type: 'int',
            isNullable: true,
          }),
        );
      }

      if (await queryRunner.hasColumn('a2d_movements', 'status')) {
        await queryRunner.query(`
          UPDATE a2d_movements
          SET minor = CAST(status AS UNSIGNED),
              status = CASE WHEN CAST(status AS UNSIGNED) = 38 THEN 1 ELSE 0 END
          WHERE (minor = 0 OR minor IS NULL)
            AND status IS NOT NULL
            AND CAST(status AS UNSIGNED) NOT IN (0, 1)
        `);
        await queryRunner.changeColumn(
          'a2d_movements',
          'status',
          new TableColumn({
            name: 'status',
            type: 'tinyint',
            default: 1,
            isNullable: false,
          }),
        );
      } else {
        await queryRunner.addColumn(
          'a2d_movements',
          new TableColumn({ name: 'status', type: 'tinyint', default: 1 }),
        );
      }

      let movementTable = await queryRunner.getTable('a2d_movements');
      const legacyIndex = movementTable?.indices.find(
        (index) => index.name === 'UQ_a2d_movement_user_timestamp',
      );
      if (legacyIndex) {
        await queryRunner.dropIndex('a2d_movements', legacyIndex);
        movementTable = await queryRunner.getTable('a2d_movements');
      }
      const hasNewIndex = movementTable?.indices.some(
        (index) => index.name === 'UQ_a2d_movement_user_timestamp_minor',
      );
      if (!hasNewIndex) {
        await queryRunner.createIndex(
          'a2d_movements',
          new TableIndex({
            name: 'UQ_a2d_movement_user_timestamp_minor',
            columnNames: ['user', 'timestamp', 'minor'],
            isUnique: true,
          }),
        );
      }

      await queryRunner.query(`
        UPDATE a2d_movements movement
        INNER JOIN personal ON personal.cedula = movement.user
        SET movement.personal_id = personal.id
        WHERE movement.personal_id IS NULL
      `);

      const hasMovementForeignKey = movementTable?.foreignKeys.some(
        (foreignKey) => foreignKey.name === 'FK_a2d_movement_personal',
      );
      if (!hasMovementForeignKey) {
        await queryRunner.createForeignKey(
          'a2d_movements',
          new TableForeignKey({
            name: 'FK_a2d_movement_personal',
            columnNames: ['personal_id'],
            referencedTableName: 'personal',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        );
      }
    }

    await queryRunner.query(
      'CREATE OR REPLACE VIEW personal_daily_attendance_intervals AS ' +
        ATTENDANCE_VIEW,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP VIEW IF EXISTS personal_daily_attendance_intervals',
    );
  }
}
