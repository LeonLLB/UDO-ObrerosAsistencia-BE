import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntidadPersonal } from '../personal/entities/personal.entity';
import { ControladorAreas } from './areas.controller';
import { EntidadArea } from './entities/area.entity';
import { ServicioAreas } from './areas.service';

@Module({
  imports: [TypeOrmModule.forFeature([EntidadArea, EntidadPersonal])],
  controllers: [ControladorAreas],
  providers: [ServicioAreas],
  exports: [ServicioAreas],
})
export class ModuloAreas {}
