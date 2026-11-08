import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { In, Repository } from 'typeorm';
import { obtenerConAutenticacionDigest } from './digest-auth';
import {
  EventoDispositivoDto,
  RespuestaEventosDispositivoDto,
} from './dto/device-events.dto';
import { EntidadMovimiento } from './entities/movement.entity';
import { EntidadPersonal } from '../personal/entities/personal.entity';

const DESFASE_HORARIO_PREDETERMINADO = '-04:00';
const ZONA_HORARIA_DISPOSITIVO = 'America/Caracas';
const TAMANO_PAGINA = 10;
const CODIGOS_ACCESO_FALLIDO = [152, 153, 155, 157, 159];

@Injectable()
export class ServicioA2D {
  private readonly registrador = new Logger(ServicioA2D.name);
  private sincronizando = false;

  constructor(
    private readonly configuracion: ConfigService,
    @InjectRepository(EntidadMovimiento)
    private readonly repositorioMovimientos: Repository<EntidadMovimiento>,
    @InjectRepository(EntidadPersonal)
    private readonly repositorioPersonal: Repository<EntidadPersonal>,
  ) {}

  async crearUsuarioEnDispositivo(
    numeroEmpleado: string,
    nombre: string,
    activo = true,
  ): Promise<unknown> {
    return this.guardarUsuarioEnDispositivo(numeroEmpleado, nombre, activo);
  }

  async actualizarUsuarioEnDispositivo(
    numeroEmpleado: string,
    nombre: string,
    activo = true,
  ): Promise<unknown> {
    return this.guardarUsuarioEnDispositivo(numeroEmpleado, nombre, activo);
  }

  private async guardarUsuarioEnDispositivo(
    numeroEmpleado: string,
    nombre: string,
    activo: boolean,
  ): Promise<unknown> {
    try {
      return await this.solicitarAlDispositivo(
        '/ISAPI/AccessControl/UserInfo/SetUp?format=json',
        'PUT',
        {
          UserInfo: {
            employeeNo: numeroEmpleado,
            name: nombre,
            userType: 'normal',
            Valid: {
              enable: activo, 
              beginTime: '2023-01-01T00:00:00',
              endTime: activo ? '2030-12-31T23:59:59' : '2023-12-31T23:59:59',
            },
            doorRight: activo ? '1' : '',
            RightPlan: activo ? [{ doorNo: 1, planTemplateNo: '1' }] : []
          },
        },
      );
    } catch (error) {
      this.registrador.error(
        'No se pudo crear el usuario en el dispositivo',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async verificarDispositivoDisponible(): Promise<boolean> {
    try {
      const ipDispositivo =
        this.configuracion.getOrThrow<string>('IP_DISPOSITIVO');
      const urlBase = ipDispositivo.includes('://')
        ? ipDispositivo
        : `http://${ipDispositivo}`;
      const respuesta = await fetch(
        new URL('/ISAPI/System/time', urlBase),
        { signal: AbortSignal.timeout(2000) },
      );

      return true     
    } catch (error: any) {
        // Si el error es por el timeout o porque no hay ruta de red (desconectado)
        if (error.name === 'TimeoutError' || error.cause?.code === 'EHOSTUNREACH' || error.cause?.code === 'ECONNREFUSED') {
          this.registrador.warn('El dispositivo biométrico no responde al ping. Está fuera de línea o apagado.');
          return false;
        }
        
        // Si arrojó cualquier otro tipo de error HTTP pero hubo conexión, está vivo
        return true;
      }
    }

  async eliminarUsuariosDelDispositivo(
    numerosEmpleado: string[],
  ): Promise<unknown> {
    try {
      return await this.solicitarAlDispositivo(
        '/ISAPI/AccessControl/UserInfoDetail/Delete?format=json',
        'PUT',
        {
          UserInfoDetail: {
            mode: 'byEmployeeNo',
            EmployeeNoList: numerosEmpleado.map((numeroEmpleado) => ({
              employeeNo: numeroEmpleado,
            })),
          },
        },
      );
    } catch (error) {
      this.registrador.error(
        `No se pudieron eliminar usuarios del dispositivo: ${numerosEmpleado.join(', ')}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async obtenerEventosDiarios(fecha: string): Promise<{
    accesosValidos: EventoDispositivoDto[];
    accesosFallidos: EventoDispositivoDto[];
  }> {
    try {
      const eventos: EventoDispositivoDto[] = [];
      let posicionResultadoBusqueda = 0;
      let estadoRespuesta = 'MORE';

      while (estadoRespuesta === 'MORE') {
        const pagina = await this.solicitarAlDispositivo(
          '/ISAPI/AccessControl/AcsEvent?format=json',
          'POST',
          {
            AcsEventCond: {
              searchID: 'api_extraction',
              searchResultPosition: posicionResultadoBusqueda,
              maxResults: TAMANO_PAGINA,
              major: 5,
              minor: 0,
              startTime: `${fecha}T00:00:00${this.obtenerDesfaseHorario()}`,
              endTime: `${fecha}T23:59:59${this.obtenerDesfaseHorario()}`,
            },
          },
        );
        const respuesta = this.validarRespuestaEventos(pagina);
        const eventoAcceso = respuesta.eventoAcceso;

        eventos.push(...(eventoAcceso.listaInformacion ?? []));
        estadoRespuesta =
          eventoAcceso.estadoRespuestaExtendido ??
          eventoAcceso.estadoRespuesta ??
          '';
        posicionResultadoBusqueda += TAMANO_PAGINA;
      }

      return {
        accesosValidos: eventos.filter((evento) => evento.codigoMenor === 38),
        accesosFallidos: eventos.filter((evento) =>
          CODIGOS_ACCESO_FALLIDO.includes(evento.codigoMenor ?? -1),
        ),
      };
    } catch (error) {
      this.registrador.error(
        `No se pudieron obtener los eventos del dispositivo para ${fecha}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sincronizarEventosDispositivo(): Promise<void> {
    if (this.sincronizando) {
      this.registrador.warn(
        'Se omite la sincronización; la anterior todavía está en curso',
      );
      return;
    }

    this.sincronizando = true;
    try {
      const fecha = this.obtenerFechaDispositivo();
      const { accesosValidos, accesosFallidos } =
        await this.obtenerEventosDiarios(fecha);
      const movimientos = await this.guardarEventos([
        ...accesosValidos,
        ...accesosFallidos,
      ]);

      this.registrador.log(
        `Se sincronizaron ${movimientos.length} movimientos del dispositivo`,
      );
    } catch (error) {
      this.registrador.error(
        'No se pudieron sincronizar los eventos del dispositivo',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    } finally {
      this.sincronizando = false;
    }
  }

  @Cron('5 0 * * *', { timeZone: ZONA_HORARIA_DISPOSITIVO })
  async cerrarMovimientosDelDiaAnterior(): Promise<void> {
    const fecha = this.obtenerFechaDispositivo(1);
    try {
      const cantidadCerrada = await this.cerrarMovimientosIncompletos(fecha);
      this.registrador.log(
        `Se cerraron ${cantidadCerrada} movimientos sin pareja del ${fecha}`,
      );
    } catch (error) {
      this.registrador.error(
        `No se pudieron cerrar los movimientos sin pareja del ${fecha}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async cerrarMovimientosIncompletos(fecha: string): Promise<number> {
    await this.repositorioMovimientos
      .createQueryBuilder()
      .update(EntidadMovimiento)
      .set({ estado: 1 })
      .where('codigo_menor = :codigoMenor', { codigoMenor: 38 })
      .andWhere('DATE(fecha_hora) = :fecha', { fecha })
      .execute();

    const movimientosDiarios = await this.repositorioMovimientos
      .createQueryBuilder('movimiento')
      .select('movimiento.id', 'id')
      .addSelect('movimiento.usuario', 'usuario')
      .where('movimiento.codigoMenor = :codigoMenor', { codigoMenor: 38 })
      .andWhere('movimiento.estado = 1')
      .andWhere('DATE(movimiento.fechaHora) = :fecha', { fecha })
      .orderBy('movimiento.usuario', 'ASC')
      .addOrderBy('movimiento.fechaHora', 'DESC')
      .addOrderBy('movimiento.id', 'DESC')
      .getRawMany<{ id: number; usuario: string }>();

    const idsSinPareja: number[] = [];
    let usuarioActual: string | undefined;
    let cantidadMovimientos = 0;
    let idUltimoMovimiento: number | undefined;

    const cerrarMovimientosDelUsuario = () => {
      if (cantidadMovimientos % 2 === 1 && idUltimoMovimiento !== undefined) {
        idsSinPareja.push(idUltimoMovimiento);
      }
    };

    for (const movimiento of movimientosDiarios) {
      if (movimiento.usuario !== usuarioActual) {
        cerrarMovimientosDelUsuario();
        usuarioActual = movimiento.usuario;
        cantidadMovimientos = 0;
        idUltimoMovimiento = movimiento.id;
      }
      cantidadMovimientos += 1;
    }
    cerrarMovimientosDelUsuario();

    if (idsSinPareja.length === 0) {
      return 0;
    }

    const resultado = await this.repositorioMovimientos
      .createQueryBuilder()
      .update(EntidadMovimiento)
      .set({ estado: 0 })
      .whereInIds(idsSinPareja)
      .execute();
    return resultado.affected ?? 0;
  }

  private obtenerFechaDispositivo(diasAtras = 0): string {
    const desfase = this.obtenerDesfaseHorario();
    const partes = /^([+-])(\d{2}):(\d{2})$/.exec(desfase);
    if (!partes) {
      throw new Error(
        'DESFASE_HORARIO_DISPOSITIVO debe tener el formato +HH:MM o -HH:MM',
      );
    }
    const signo = partes[1] === '-' ? -1 : 1;
    const minutosDesfase = signo * (Number(partes[2]) * 60 + Number(partes[3]));
    const fecha = new Date(Date.now() + minutosDesfase * 60 * 1000);
    fecha.setUTCDate(fecha.getUTCDate() - diasAtras);
    return fecha.toISOString().slice(0, 10);
  }

  private obtenerDesfaseHorario(): string {
    return (
      this.configuracion.get<string>('DESFASE_HORARIO_DISPOSITIVO') ??
      DESFASE_HORARIO_PREDETERMINADO
    );
  }

  private validarRespuestaEventos(
    respuesta: unknown,
  ): RespuestaEventosDispositivoDto {
    const respuestaEventos = plainToInstance(
      RespuestaEventosDispositivoDto,
      respuesta,
    );
    const errores = validateSync(respuestaEventos, { whitelist: true });
    if (errores.length > 0) {
      throw new Error(
        `Respuesta de eventos inválida: ${errores
          .map((error) => error.property)
          .join(', ')}`,
      );
    }
    return respuestaEventos;
  }

  private convertirARegistroMovimiento(
    evento: EventoDispositivoDto,
  ): EntidadMovimiento | null {
    const usuario = evento.numeroEmpleadoTexto ?? evento.numeroEmpleado;
    if (!usuario || !evento.fechaHora || evento.codigoMenor === undefined) {
      return null;
    }

    const fechaHora = new Date(evento.fechaHora);
    if (Number.isNaN(fechaHora.getTime())) {
      return null;
    }

    const movimiento = new EntidadMovimiento();
    movimiento.usuario = usuario;
    movimiento.fechaHora = fechaHora;
    movimiento.codigoMenor = evento.codigoMenor;
    movimiento.estado = evento.codigoMenor === 38 ? 1 : 0;
    return movimiento;
  }

  private async guardarEventos(
    eventos: EventoDispositivoDto[],
  ): Promise<EntidadMovimiento[]> {
    const movimientos = eventos
      .map((evento) => this.convertirARegistroMovimiento(evento))
      .filter(
        (movimiento): movimiento is EntidadMovimiento => movimiento !== null,
      );
    if (movimientos.length === 0) {
      return [];
    }

    const usuarios = [
      ...new Set(movimientos.map((movimiento) => movimiento.usuario)),
    ];
    const personal = await this.repositorioPersonal.find({
      where: { cedula: In(usuarios) },
    });
    const personalPorCedula = new Map(
      personal.map((persona) => [persona.cedula, persona]),
    );
    for (const movimiento of movimientos) {
      movimiento.personal = personalPorCedula.get(movimiento.usuario) ?? null;
    }

    await this.repositorioMovimientos
      .createQueryBuilder()
      .insert()
      .into(EntidadMovimiento)
      .values(movimientos)
      .orIgnore()
      .execute();

    for (const persona of personal) {
      await this.repositorioMovimientos
        .createQueryBuilder()
        .update(EntidadMovimiento)
        .set({ personal: { id: persona.id } })
        .where('usuario = :cedula', { cedula: persona.cedula })
        .andWhere('personal_id IS NULL')
        .execute();
    }

    return movimientos;
  }

  private async solicitarAlDispositivo(
    ruta: string,
    metodo: 'POST' | 'PUT',
    cuerpo: unknown,
  ): Promise<unknown> {
    const ipDispositivo =
      this.configuracion.getOrThrow<string>('IP_DISPOSITIVO');
    const urlBase = ipDispositivo.includes('://')
      ? ipDispositivo
      : `http://${ipDispositivo}`;
    const respuesta = await obtenerConAutenticacionDigest(
      new URL(ruta, urlBase),
      {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      },
      this.configuracion.getOrThrow<string>('USUARIO_DISPOSITIVO'),
      this.configuracion.getOrThrow<string>('CLAVE_DISPOSITIVO'),
    );
    const cuerpoRespuesta = await respuesta.text();

    if (!respuesta.ok) {
      throw new Error(
        `La solicitud al dispositivo falló con HTTP ${respuesta.status}: ${cuerpoRespuesta}`,
      );
    }
    if (!cuerpoRespuesta) {
      return null;
    }

    let resultado: unknown;
    try {
      resultado = JSON.parse(cuerpoRespuesta) as unknown;
    } catch {
      return cuerpoRespuesta;
    }

    if (
      typeof resultado === 'object' &&
      resultado !== null &&
      'statusCode' in resultado &&
      Number(resultado.statusCode) !== 1
    ) {
      throw new Error(
        `El dispositivo rechazó la operación: ${JSON.stringify(resultado)}`,
      );
    }
    return resultado;
  }
}
