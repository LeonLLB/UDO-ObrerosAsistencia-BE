import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UserStatus1793939000000 implements MigrationInterface {
  name = 'UserStatus1793939000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (
      (await queryRunner.hasTable('usuarios')) &&
      !(await queryRunner.hasColumn('usuarios', 'status'))
    ) {
      await queryRunner.addColumn(
        'usuarios',
        new TableColumn({
          name: 'status',
          type: 'tinyint',
          default: 1,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (
      (await queryRunner.hasTable('usuarios')) &&
      (await queryRunner.hasColumn('usuarios', 'status'))
    ) {
      await queryRunner.dropColumn('usuarios', 'status');
    }
  }
}
