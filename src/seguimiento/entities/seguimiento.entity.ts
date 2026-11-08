import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadUsuario } from '../../users/entities/user.entity';

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

  @ManyToOne(() => EntidadUsuario, (usuario) => usuario.seguimientos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  usuario!: EntidadUsuario | null;

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
