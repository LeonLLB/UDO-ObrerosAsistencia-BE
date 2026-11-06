import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuloA2D } from '../a2d/a2d.module';
import { EntidadMovimiento } from '../a2d/entities/movement.entity';
import { EntidadArea } from './entities/area.entity';
import { EntidadPersonal } from './entities/personal.entity';
import { VistaIntervalosAsistenciaDiaria } from './entities/daily-attendance-interval.view';
import { VistaResumenAsistenciaDiaria } from './entities/daily-attendance-summary.view';
import { ControladorAreas } from './areas.controller';
import { ControladorPersonal } from './personal.controller';
import { ServicioPersonal } from './personal.service';

@Module({
  imports: [
    ModuloA2D,
    TypeOrmModule.forFeature([
      EntidadPersonal,
      EntidadArea,
      EntidadMovimiento,
      VistaIntervalosAsistenciaDiaria,
      VistaResumenAsistenciaDiaria,
    ]),
  ],
  controllers: [ControladorPersonal, ControladorAreas],
  providers: [ServicioPersonal],
  exports: [ServicioPersonal],
})
export class ModuloPersonal {}
