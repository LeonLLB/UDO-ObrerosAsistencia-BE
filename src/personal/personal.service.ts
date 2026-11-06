import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicioA2D } from '../a2d/a2d.service';
import { CrearAreaDto } from './dto/create-area.dto';
import { CrearPersonalDto } from './dto/create-personal.dto';
import { ActualizarAreaDto } from './dto/update-area.dto';
import { ActualizarPersonalDto } from './dto/update-personal.dto';
import { EntidadArea } from './entities/area.entity';
import { EntidadPersonal } from './entities/personal.entity';
import { EntidadMovimiento } from '../a2d/entities/movement.entity';
import { VistaIntervalosAsistenciaDiaria } from './entities/daily-attendance-interval.view';
import { VistaResumenAsistenciaDiaria } from './entities/daily-attendance-summary.view';

@Injectable()
export class ServicioPersonal {
  constructor(
    private readonly servicioA2D: ServicioA2D,
    @InjectRepository(EntidadPersonal)
    private readonly repositorioPersonal: Repository<EntidadPersonal>,

    @InjectRepository(EntidadArea)
    private readonly repositorioAreas: Repository<EntidadArea>,

    @InjectRepository(EntidadMovimiento)
    private readonly repositorioMovimientos: Repository<EntidadMovimiento>,

    @InjectRepository(VistaIntervalosAsistenciaDiaria)
    private readonly repositorioVistaIntervalos: Repository<VistaIntervalosAsistenciaDiaria>,

    @InjectRepository(VistaResumenAsistenciaDiaria)
    private readonly repositorioVistaResumen: Repository<VistaResumenAsistenciaDiaria>,
  ) {}

  async crear(dto: CrearPersonalDto): Promise<EntidadPersonal> {
    const area = await this.buscarArea(dto.idAreaEncargada);
    await this.servicioA2D.crearUsuarioEnDispositivo(
      dto.cedula,
      `${dto.nombres} ${dto.apellidos}`,
    );
    const personal = this.repositorioPersonal.create({
      cedula: dto.cedula,
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      fechaIngreso: dto.fechaIngreso,
      estado: dto.estado ?? 1,
      areaEncargada: area,
    });
    const personalGuardado = await this.repositorioPersonal.save(personal);
    await this.repositorioMovimientos
      .createQueryBuilder()
      .update(EntidadMovimiento)
      .set({ personal: { id: personalGuardado.id } })
      .where('usuario = :cedula', { cedula: personalGuardado.cedula })
      .andWhere('personal_id IS NULL')
      .execute();
    return personalGuardado;
  }

  buscarTodos(): Promise<EntidadPersonal[]> {
    return this.repositorioPersonal.find({
      relations: { areaEncargada: true },
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });
  }

  async buscarPorId(id: number): Promise<EntidadPersonal> {
    const personal = await this.repositorioPersonal.findOne({
      where: { id },
      relations: { areaEncargada: true },
    });
    if (!personal) {
      throw new NotFoundException(`No se encontró el personal con id ${id}`);
    }
    return personal;
  }

  async actualizar(
    id: number,
    dto: ActualizarPersonalDto,
  ): Promise<EntidadPersonal> {
    const personal = await this.buscarPorId(id);
    const { cedula, idAreaEncargada, ...campos } = dto;
    if (cedula !== undefined && cedula !== personal.cedula) {
      throw new BadRequestException(
        'La cédula no se puede modificar. Elimina el personal y vuelve a registrarlo con la cédula correcta.',
      );
    }

    const nombresNuevos = dto.nombres ?? personal.nombres;
    const apellidosNuevos = dto.apellidos ?? personal.apellidos;
    const cambioDatosDispositivo =
      nombresNuevos !== personal.nombres ||
      apellidosNuevos !== personal.apellidos;

    if (cambioDatosDispositivo) {
      await this.servicioA2D.actualizarUsuarioEnDispositivo(
        personal.cedula,
        `${nombresNuevos} ${apellidosNuevos}`,
      );
    }

    Object.assign(personal, campos);
    if (idAreaEncargada !== undefined) {
      personal.areaEncargada = await this.buscarArea(idAreaEncargada);
    }
    return this.repositorioPersonal.save(personal);
  }

  async eliminar(id: number): Promise<void> {
    const personal = await this.buscarPorId(id);
    await this.servicioA2D.eliminarUsuariosDelDispositivo([personal.cedula]);
    await this.repositorioPersonal.remove(personal);
  }

  async obtenerAsistenciaDiaria(
    id: number,
    fecha: string,
  ): Promise<{
    fecha: string;
    personal: {
      id: number;
      cedula: string;
      nombres: string;
      apellidos: string;
    };
    minutosTotales: number;
    horas: number;
    minutos: number;
    intervalos: Array<{
      entrada: Date;
      salida: Date;
      minutos: number;
    }>;
  }> {
    const personal = await this.buscarPorId(id);
    const intervalos = await this.repositorioVistaIntervalos.find({
      where: { idPersonal: personal.id, fechaTrabajo: fecha },
      order: { horaEntrada: 'ASC' },
    });
    const segundosTotales = intervalos.reduce(
      (total, intervalo) => total + Number(intervalo.duracionSegundos),
      0,
    );
    const minutosTotales = Math.floor(segundosTotales / 60);
    return {
      fecha,
      personal: {
        id: personal.id,
        cedula: personal.cedula,
        nombres: personal.nombres,
        apellidos: personal.apellidos,
      },
      minutosTotales,
      horas: Math.floor(minutosTotales / 60),
      minutos: minutosTotales % 60,
      intervalos: intervalos.map((intervalo) => ({
        entrada: intervalo.horaEntrada,
        salida: intervalo.horaSalida,
        minutos: Math.floor(Number(intervalo.duracionSegundos) / 60),
      })),
    };
  }

  async obtenerResumenAsistenciaDiaria(fecha: string): Promise<
    Array<{
      idPersonal: number;
      cedula: string;
      nombres: string;
      apellidos: string;
      fecha: string;
      duracionSegundos: number;
      horasTrabajadas: number;
    }>
  > {
    const resumenes = await this.repositorioVistaResumen.find({
      where: { fechaTrabajo: fecha },
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });
    return resumenes.map((resumen) => ({
      idPersonal: resumen.idPersonal,
      cedula: resumen.cedula,
      nombres: resumen.nombres,
      apellidos: resumen.apellidos,
      fecha: new Date(resumen.fechaTrabajo).toISOString().slice(0, 10),
      duracionSegundos: Number(resumen.duracionSegundos),
      horasTrabajadas: Number(resumen.horasTrabajadas),
    }));
  }

  async crearArea(dto: CrearAreaDto): Promise<EntidadArea> {
    return this.repositorioAreas.save(this.repositorioAreas.create(dto));
  }

  buscarTodasLasAreas(): Promise<EntidadArea[]> {
    return this.repositorioAreas.find({ order: { nombre: 'ASC' } });
  }

  async buscarAreaPorId(id: number): Promise<EntidadArea> {
    return this.buscarArea(id);
  }

  async actualizarArea(
    id: number,
    dto: ActualizarAreaDto,
  ): Promise<EntidadArea> {
    const area = await this.buscarArea(id);
    Object.assign(area, dto);
    return this.repositorioAreas.save(area);
  }

  async eliminarArea(id: number): Promise<void> {
    const area = await this.buscarArea(id);
    const cantidadPersonal = await this.repositorioPersonal.count({
      where: { areaEncargada: { id } },
    });
    if (cantidadPersonal > 0) {
      throw new ConflictException(
        'No se puede eliminar un área que tiene personal asignado',
      );
    }
    await this.repositorioAreas.remove(area);
  }

  private async buscarArea(id: number): Promise<EntidadArea> {
    const area = await this.repositorioAreas.findOneBy({ id });
    if (!area) {
      throw new NotFoundException(`No se encontró el área con id ${id}`);
    }
    return area;
  }
}
