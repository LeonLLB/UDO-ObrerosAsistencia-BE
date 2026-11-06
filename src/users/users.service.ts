import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CrearUsuarioDto } from './dtos/create-user.dto';
import { ActualizarUsuarioDto } from './dtos/update-user.dto';
import { EntidadUsuario } from './entities/user.entity';
import type { UsuarioAutenticado } from './interfaces/usuario-autenticado.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(EntidadUsuario)
    private readonly repositorioUsuarios: Repository<EntidadUsuario>,
  ) {}

  async buscarTodos(): Promise<UsuarioAutenticado[]> {
    const usuarios = await this.repositorioUsuarios.find({
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });
    return usuarios.map((usuario) => this.aUsuarioAutenticado(usuario));
  }

  async buscarPorCedula(cedula: string): Promise<UsuarioAutenticado> {
    const usuario = await this.repositorioUsuarios.findOneBy({ cedula });
    if (!usuario) {
      throw new NotFoundException(`No se encontró el usuario ${cedula}`);
    }
    return this.aUsuarioAutenticado(usuario);
  }

  async obtenerStatus(cedula: string): Promise<{ status: 0 | 1 }> {
    const usuario = await this.repositorioUsuarios.findOne({
      where: { cedula },
      select: { cedula: true, status: true },
    });
    return { status: usuario?.status ?? 0 };
  }

  async crear(dto: CrearUsuarioDto): Promise<UsuarioAutenticado> {
    if (await this.repositorioUsuarios.existsBy({ cedula: dto.cedula })) {
      throw new ConflictException('Ya existe un usuario con esa cédula');
    }

    const usuario = this.repositorioUsuarios.create({
      cedula: dto.cedula,
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      tipo: dto.tipo,
      status: 1,
      claveHash: await bcrypt.hash(dto.clave, 10),
    });
    return this.aUsuarioAutenticado(
      await this.repositorioUsuarios.save(usuario),
    );
  }

  async actualizar(
    cedula: string,
    dto: ActualizarUsuarioDto,
  ): Promise<UsuarioAutenticado> {
    const usuario = await this.buscarEntidad(cedula);
    Object.assign(usuario, dto);
    return this.aUsuarioAutenticado(
      await this.repositorioUsuarios.save(usuario),
    );
  }

  async reiniciarClave(cedula: string): Promise<{ message: string }> {
    const usuario = await this.buscarEntidad(cedula);
    usuario.status = 0;
    await this.repositorioUsuarios.save(usuario);
    return { message: 'Clave reiniciada; debe registrarse nuevamente' };
  }

  async eliminar(cedula: string, cedulaSolicitante: string): Promise<void> {
    if (cedula === cedulaSolicitante) {
      throw new ConflictException('No puede eliminar su propia cuenta');
    }
    const usuario = await this.buscarEntidad(cedula);
    await this.repositorioUsuarios.remove(usuario);
  }

  private async buscarEntidad(cedula: string): Promise<EntidadUsuario> {
    const usuario = await this.repositorioUsuarios.findOneBy({ cedula });
    if (!usuario) {
      throw new NotFoundException(`No se encontró el usuario ${cedula}`);
    }
    return usuario;
  }

  private aUsuarioAutenticado(usuario: EntidadUsuario): UsuarioAutenticado {
    return {
      cedula: usuario.cedula,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      tipo: usuario.tipo,
    };
  }
}
