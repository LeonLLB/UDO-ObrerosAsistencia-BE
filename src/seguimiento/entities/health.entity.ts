import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Health' })
export class EntidadHealth {
  @PrimaryGeneratedColumn({ name: 'ID' })
  id!: number;

  @Column({ name: 'STATUS', type: 'tinyint' })
  status!: number;

  @Column({ name: 'MOTIVO', type: 'varchar', length: 255, nullable: true })
  motivo!: string | null;
}
