import { Column, Entity, PrimaryColumn } from 'typeorm';
import { TipoUsuario } from '../tipo-usuario';

@Entity({ name: 'usuarios' })
export class EntidadUsuario {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  cedula!: string;

  @Column({ type: 'varchar', length: 100 })
  nombres!: string;

  @Column({ type: 'varchar', length: 100 })
  apellidos!: string;

  @Column({ type: 'varchar', length: 1 })
  tipo!: TipoUsuario;

  @Column({ type: 'tinyint', default: 0 })
  status!: 0 | 1;

  @Column({ name: 'clave', type: 'varchar', length: 255, select: false })
  claveHash!: string;
}
