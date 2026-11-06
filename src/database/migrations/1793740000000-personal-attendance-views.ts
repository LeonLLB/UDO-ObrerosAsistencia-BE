import { MigrationInterface, QueryRunner } from 'typeorm';

const ATTENDANCE_INTERVAL_VIEW = `
  SELECT
    paired.personal_id AS personal_id,
    personal.cedula AS cedula,
    personal.nombres AS nombres,
    personal.apellidos AS apellidos,
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
  INNER JOIN personal ON personal.id = paired.personal_id
  WHERE MOD(paired.movement_number, 2) = 1
    AND paired.exit_time IS NOT NULL
    AND paired.exit_time > paired.entry_time
`;

const LEGACY_ATTENDANCE_INTERVAL_VIEW = `
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

export class PersonalAttendanceViews1793740000000 implements MigrationInterface {
  name = 'PersonalAttendanceViews1793740000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE OR REPLACE VIEW personal_daily_attendance_intervals AS ' +
        ATTENDANCE_INTERVAL_VIEW,
    );
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

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP VIEW IF EXISTS personal_daily_attendance_summary',
    );
    await queryRunner.query(
      'CREATE OR REPLACE VIEW personal_daily_attendance_intervals AS ' +
        LEGACY_ATTENDANCE_INTERVAL_VIEW,
    );
  }
}
