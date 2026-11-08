import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { EntidadUsuario } from './entities/user.entity';
import { LoginDto } from './dtos/login.dto';
import type { UsuarioAutenticado } from './interfaces/usuario-autenticado.interface';
import { TipoUsuario } from './tipo-usuario';

type TokenSesion = {
  sub: string;
  tipo: TipoUsuario;
};

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private readonly redis: Redis;

  constructor(
    @InjectRepository(EntidadUsuario)
    private readonly repositorioUsuarios: Repository<EntidadUsuario>,
    private readonly servicioJwt: JwtService,
    configuracion: ConfigService,
  ) {
    this.redis = new Redis(
      configuracion.get<string>('REDIS_URI') ?? 'redis://127.0.0.1:6379',
      { lazyConnect: true },
    );
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }

  async login(dto: LoginDto): Promise<{
    usuario: UsuarioAutenticado;
    token: string;
  }> {
    const usuario = await this.repositorioUsuarios.findOne({
      where: { cedula: dto.cedula },
      select: {
        cedula: true,
        nombres: true,
        apellidos: true,
        tipo: true,
        status: true,
        claveHash: true,
      },
    });

    if (
      !usuario ||
      usuario.status !== 1 ||
      usuario.claveHash === null ||
      !(await bcrypt.compare(dto.clave, usuario.claveHash))
    ) {
      throw new UnauthorizedException('Cédula o clave inválida');
    }

    const token = await this.crearToken(usuario);
    await this.guardarTokenSesion(
      this.claveSesion(usuario.tipo, usuario.cedula),
      token,
    );

    return {
      usuario: this.aUsuarioAutenticado(usuario),
      token,
    };
  }

  async validarToken(token: string): Promise<UsuarioAutenticado> {
    const payload = await this.verificarToken(token);
    const usuario = await this.repositorioUsuarios.findOneBy({
      cedula: payload.sub,
    });

    if (!usuario || usuario.tipo !== payload.tipo || usuario.status !== 1) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }

    const tokenSesion = await this.obtenerTokenSesion(
      this.claveSesion(payload.tipo, payload.sub),
    );
    if (tokenSesion !== token) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }

    return this.aUsuarioAutenticado(usuario);
  }

  async revalidar(token: string): Promise<{
    usuario: UsuarioAutenticado;
    newToken: string;
  }> {
    const payload = await this.verificarToken(token);
    const usuario = await this.repositorioUsuarios.findOneBy({
      cedula: payload.sub,
    });

    if (!usuario || usuario.status !== 1) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }

    const claveAnterior = this.claveSesion(payload.tipo, payload.sub);
    const tokenSesion = await this.obtenerTokenSesion(claveAnterior);
    if (tokenSesion !== token) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }

    const newToken = await this.crearToken(usuario);
    const claveActual = this.claveSesion(usuario.tipo, usuario.cedula);
    await this.guardarTokenSesion(claveActual, newToken);
    if (claveAnterior !== claveActual) {
      await this.eliminarTokenSesion(claveAnterior);
    }

    if(process.env.NODE_ENV === 'dev') {
      console.log('revalidado:', usuario);
    }

    return {
      usuario: this.aUsuarioAutenticado(usuario),
      newToken,
    };
  }

  async logout(token: string): Promise<void> {
    if (!token) {
      throw new UnauthorizedException('No tiene un token');
    }

    const payload = await this.verificarToken(token);
    const clave = this.claveSesion(payload.tipo, payload.sub);
    const tokenSesion = await this.obtenerTokenSesion(clave);
    if (tokenSesion !== token) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }
    await this.eliminarTokenSesion(clave);
  }

  private async verificarToken(token: string): Promise<TokenSesion> {
    try {
      const payload = await this.servicioJwt.verifyAsync<
        TokenSesion & { exp?: number }
      >(token);
      if (
        typeof payload.sub !== 'string' ||
        !Object.values(TipoUsuario).includes(payload.tipo)
      ) {
        throw new UnauthorizedException('El token enviado no es válido');
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('La sesión expiró o no es válida');
    }
  }

  private crearToken(usuario: UsuarioAutenticado): Promise<string> {
    return this.servicioJwt.signAsync({
      sub: usuario.cedula,
      tipo: usuario.tipo,
    });
  }

  private claveSesion(tipo: TipoUsuario, cedula: string): string {
    return `PRE-${tipo}-${cedula}`;
  }

  private obtenerTokenSesion(clave: string): Promise<string | null> {
    return this.operarRedis(() => this.redis.get(clave));
  }

  private guardarTokenSesion(clave: string, token: string): Promise<string> {
    return this.operarRedis(() => this.redis.set(clave, token, 'EX', 20 * 60));
  }

  private async eliminarTokenSesion(clave: string): Promise<void> {
    await this.operarRedis(() => this.redis.del(clave));
  }

  private async operarRedis<T>(operacion: () => Promise<T>): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      const detalle = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        'No se pudo acceder al almacén de sesiones Redis',
        detalle,
      );
      throw new InternalServerErrorException(
        'No se pudo validar o actualizar la sesión',
      );
    }
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
