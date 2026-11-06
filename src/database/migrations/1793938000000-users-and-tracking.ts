import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class UsersAndTracking1793938000000 implements MigrationInterface {
  name = 'UsersAndTracking1793938000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('Health'))) {
      await queryRunner.createTable(
        new Table({
          name: 'Health',
          columns: [
            {
              name: 'ID',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'STATUS', type: 'tinyint' },
            {
              name: 'MOTIVO',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('usuarios'))) {
      await queryRunner.createTable(
        new Table({
          name: 'usuarios',
          columns: [
            {
              name: 'cedula',
              type: 'varchar',
              length: '20',
              isPrimary: true,
            },
            { name: 'nombres', type: 'varchar', length: '100' },
            { name: 'apellidos', type: 'varchar', length: '100' },
            { name: 'tipo', type: 'varchar', length: '1' },
            { name: 'status', type: 'tinyint', default: 0 },
            { name: 'clave', type: 'varchar', length: '255' },
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('seguimientos'))) {
      await queryRunner.createTable(
        new Table({
          name: 'seguimientos',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'ip', type: 'varchar', length: '64' },
            { name: 'url', type: 'text' },
            { name: 'execTime', type: 'int', unsigned: true },
            {
              name: 'user',
              type: 'varchar',
              length: '20',
              isNullable: true,
            },
            { name: 'method', type: 'varchar', length: '10' },
            { name: 'date', type: 'datetime' },
            { name: 'body', type: 'json', isNullable: true },
            { name: 'responseCode', type: 'smallint' },
            { name: 'cookies', type: 'json', isNullable: true },
            { name: 'headers', type: 'json', isNullable: true },
            { name: 'params', type: 'json', isNullable: true },
          ],
        }),
      );
    }

    const seguimiento = await queryRunner.getTable('seguimientos');
    if (
      !seguimiento?.indices.some(
        (indice) => indice.name === 'IDX_seguimientos_date',
      )
    ) {
      await queryRunner.createIndex(
        'seguimientos',
        new TableIndex({
          name: 'IDX_seguimientos_date',
          columnNames: ['date'],
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('seguimientos')) {
      await queryRunner.dropTable('seguimientos');
    }
    if (await queryRunner.hasTable('usuarios')) {
      await queryRunner.dropTable('usuarios');
    }
  }
}
