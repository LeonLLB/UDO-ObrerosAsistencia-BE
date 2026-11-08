import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class NullUserPassword1793941000000 implements MigrationInterface {
  name = 'NullUserPassword1793941000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasTable('usuarios')) ||
      !(await queryRunner.hasColumn('usuarios', 'clave'))
    ) {
      return;
    }

    const table = await queryRunner.getTable('usuarios');
    const clave = table?.findColumnByName('clave');
    if (!clave) return;

    await queryRunner.changeColumn(
      'usuarios',
      'clave',
      new TableColumn({
        ...clave,
        isNullable: true,
        default: null,
      }),
    );

    await queryRunner.query(`
      UPDATE \`usuarios\`
      SET \`clave\` = NULL
      WHERE \`status\` = 0
    `);
  }

  async down(): Promise<void> {
    // Reset hashes are intentionally erased and cannot be restored.
  }
}
