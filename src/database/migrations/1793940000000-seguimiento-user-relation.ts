import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class SeguimientoUserRelation1793940000000 implements MigrationInterface {
  name = 'SeguimientoUserRelation1793940000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('usuarios'))) return;

    if (!(await queryRunner.hasColumn('usuarios', 'id'))) {
      await queryRunner.query(`
        ALTER TABLE \`usuarios\`
          DROP PRIMARY KEY,
          ADD COLUMN \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST,
          ADD UNIQUE INDEX \`UQ_usuarios_cedula\` (\`cedula\`)
      `);
    }

    if (!(await queryRunner.hasTable('seguimientos'))) return;

    const tieneUserId = await queryRunner.hasColumn('seguimientos', 'user_id');
    if (!tieneUserId) {
      await queryRunner.addColumn(
        'seguimientos',
        new TableColumn({
          name: 'user_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    if (await queryRunner.hasColumn('seguimientos', 'user')) {
      await queryRunner.query(`
        UPDATE \`seguimientos\` seguimiento
        INNER JOIN \`usuarios\` usuario
          ON usuario.\`cedula\` = seguimiento.\`user\`
        SET seguimiento.\`user_id\` = usuario.\`id\`
        WHERE seguimiento.\`user\` IS NOT NULL
      `);
      await queryRunner.dropColumn('seguimientos', 'user');
    }

    const seguimiento = await queryRunner.getTable('seguimientos');
    if (
      !seguimiento?.indices.some(
        (indice) => indice.name === 'IDX_seguimientos_user_id',
      )
    ) {
      await queryRunner.createIndex(
        'seguimientos',
        new TableIndex({
          name: 'IDX_seguimientos_user_id',
          columnNames: ['user_id'],
        }),
      );
    }

    if (
      !seguimiento?.foreignKeys.some(
        (foreignKey) => foreignKey.name === 'FK_seguimientos_usuario',
      )
    ) {
      await queryRunner.createForeignKey(
        'seguimientos',
        new TableForeignKey({
          name: 'FK_seguimientos_usuario',
          columnNames: ['user_id'],
          referencedTableName: 'usuarios',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  async down(): Promise<void> {
    // Keep audit data and its relation intact when rolling back application code.
  }
}
