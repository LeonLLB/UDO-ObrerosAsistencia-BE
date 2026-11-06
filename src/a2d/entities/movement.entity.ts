import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadPersonal } from '../../personal/entities/personal.entity';

@Entity({ name: 'movimientos_a2d' })
@Index(
  'UQ_movimientos_a2d_usuario_fecha_hora_codigo_menor',
  ['usuario', 'fechaHora', 'codigoMenor'],
  { unique: true },
)
export class EntidadMovimiento {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  usuario!: string;

  @Column({ name: 'fecha_hora', type: 'datetime' })
  fechaHora!: Date;

  @Column({ name: 'codigo_menor', type: 'int', default: 0 })
  codigoMenor!: number;

  @Column({ type: 'tinyint', default: 1 })
  estado!: number;

  @ManyToOne(() => EntidadPersonal, (personal) => personal.movimientos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'personal_id' })
  personal!: EntidadPersonal | null;
}
