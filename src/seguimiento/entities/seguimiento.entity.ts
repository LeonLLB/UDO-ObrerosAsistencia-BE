import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'seguimientos' })
@Index('IDX_seguimientos_date', ['date'])
export class EntidadSeguimiento {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  ip!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'int' })
  execTime!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  user!: string | null;

  @Column({ type: 'varchar', length: 10 })
  method!: string;

  @Column({ type: 'datetime' })
  date!: Date;

  @Column({ type: 'json', nullable: true })
  body!: Record<string, unknown> | unknown[] | null;

  @Column({ type: 'smallint' })
  responseCode!: number;

  @Column({ type: 'json', nullable: true })
  cookies!: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  headers!: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  params!: Record<string, unknown> | null;
}
