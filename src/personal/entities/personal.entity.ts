import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadMovimiento } from '../../a2d/entities/movement.entity';
import { EntidadArea } from '../../areas/entities/area.entity';

@Entity({ name: 'personal' })
export class EntidadPersonal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  cedula!: string;

  @Column({ type: 'varchar', length: 100 })
  nombres!: string;

  @Column({ type: 'varchar', length: 100 })
  apellidos!: string;

  @Column({ name: 'fecha_ingreso', type: 'date' })
  fechaIngreso!: string;

  @Column({ type: 'varchar', length: 1, default: 'O' })
  tipo!: 'A' | 'O';

  @Column({ name: 'estado', type: 'tinyint', default: 1 })
  status!: 0 | 1;

  @ManyToOne(() => EntidadArea, (area) => area.personal, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'area_encargada_id' })
  areaEncargada!: EntidadArea;

  @OneToMany(() => EntidadMovimiento, (movement) => movement.personal)
  movimientos!: EntidadMovimiento[];
}
