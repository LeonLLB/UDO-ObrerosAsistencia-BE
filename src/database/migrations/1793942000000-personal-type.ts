import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class PersonalType1793942000000 implements MigrationInterface {
  name = 'PersonalType1793942000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasTable('personal')) ||
      (await queryRunner.hasColumn('personal', 'tipo'))
    ) {
      return;
    }

    await queryRunner.addColumn(
      'personal',
      new TableColumn({
        name: 'tipo',
        type: 'varchar',
        length: '20',
        default: "'obrero'",
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (
      (await queryRunner.hasTable('personal')) &&
      (await queryRunner.hasColumn('personal', 'tipo'))
    ) {
      await queryRunner.dropColumn('personal', 'tipo');
    }
  }
}
