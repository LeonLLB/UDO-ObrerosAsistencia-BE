import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CrearUsuarioDto } from './dtos/create-user.dto';
import { ActualizarUsuarioDto } from './dtos/update-user.dto';
import { EstablecerClaveDto } from './dtos/set-password.dto';
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

    if(!usuario) {
      throw new NotFoundException(`No se encontró el usuario con cédula ${cedula}`);
    }

    return { status: usuario?.status ?? 0 };
  }

  async establecerClave(dto: EstablecerClaveDto): Promise<{ message: string }> {
    if (dto.password !== dto.password2) {
      throw new BadRequestException('Las claves no coinciden');
    }

    const usuario = await this.repositorioUsuarios.findOne({
      where: { cedula: dto.cedula },
    });

    console.log('Usuario encontrado:', usuario);
    if (!usuario) {
      throw new NotFoundException('Cédula no registrada');
    }
    if (usuario.status !== 0) {
      throw new ConflictException(
        'La clave ya fue creada; contacte al administrador',
      );
    }

    const claveHash = await bcrypt.hash(dto.password, 10);
    const resultado = await this.repositorioUsuarios.update(
      { cedula: dto.cedula, status: 0 },
      { claveHash, status: 1 },
    );
    if (resultado.affected !== 1) {
      throw new ConflictException(
        'La clave ya fue creada; contacte al administrador',
      );
    }

    return { message: 'Clave creada con éxito' };
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
      status: 0
    });
    return this.aUsuarioAutenticado(
      await this.repositorioUsuarios.save(usuario),
    );
  }

  async actualizar(
    id: number,
    dto: ActualizarUsuarioDto,
  ): Promise<UsuarioAutenticado> {
    const usuario = await this.buscarEntidad(id,true);
    Object.assign(usuario, dto);
    return this.aUsuarioAutenticado(
      await this.repositorioUsuarios.save(usuario),
    );
  }

  async reiniciarClave(id: number): Promise<{ message: string }> {
    const usuario = await this.buscarEntidad(id,true);
    usuario.status = 0;
    usuario.claveHash = null;
    await this.repositorioUsuarios.save(usuario);
    return { message: 'Clave eliminada; debe registrarse nuevamente' };
  }

  async eliminar(id: number, idSolicitante: number): Promise<void> {
    if (id === idSolicitante) {
      throw new ConflictException('No puede eliminar su propia cuenta');
    }
    const usuario = await this.buscarEntidad(id,true);
    await this.repositorioUsuarios.remove(usuario);
  }

  private async buscarEntidad(id: number | string, byId?: boolean): Promise<EntidadUsuario> {
    const usuario = await this.repositorioUsuarios.findOneBy(byId ? { id: id as number } : { cedula: id as string });
    if (!usuario) {
      throw new NotFoundException(`No se encontró el usuario ${id}`);
    }
    return usuario;
  }

  private aUsuarioAutenticado(usuario: EntidadUsuario): UsuarioAutenticado {
    return {
      id: usuario.id,
      cedula: usuario.cedula,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      tipo: usuario.tipo,
    };
  }
}
