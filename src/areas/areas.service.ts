import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntidadPersonal } from '../personal/entities/personal.entity';
import { CrearAreaDto } from './dto/create-area.dto';
import { ActualizarAreaDto } from './dto/update-area.dto';
import { EntidadArea } from './entities/area.entity';

@Injectable()
export class ServicioAreas {
  constructor(
    @InjectRepository(EntidadArea)
    private readonly repositorioAreas: Repository<EntidadArea>,
    @InjectRepository(EntidadPersonal)
    private readonly repositorioPersonal: Repository<EntidadPersonal>,
  ) {}

  crear(dto: CrearAreaDto): Promise<EntidadArea> {
    return this.repositorioAreas.save(this.repositorioAreas.create(dto));
  }

  buscarTodas(): Promise<EntidadArea[]> {
    return this.repositorioAreas.find({ order: { nombre: 'ASC' } });
  }

  async buscarPorId(id: number): Promise<EntidadArea> {
    return this.buscarArea(id);
  }

  async actualizar(id: number, dto: ActualizarAreaDto): Promise<EntidadArea> {
    const area = await this.buscarArea(id);
    Object.assign(area, dto);
    return this.repositorioAreas.save(area);
  }

  async eliminar(id: number): Promise<void> {
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
