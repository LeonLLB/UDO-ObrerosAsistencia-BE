import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { EntidadPersonal } from './personal.entity';

@Entity({ name: 'areas' })
export class EntidadArea {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120, unique: true })
  nombre!: string;

  @OneToMany(() => EntidadPersonal, (personal) => personal.areaEncargada)
  personal!: EntidadPersonal[];
}
