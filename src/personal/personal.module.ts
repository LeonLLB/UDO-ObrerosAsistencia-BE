import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuloA2D } from '../a2d/a2d.module';
import { UsersModule } from '../users/users.module';
import { EntidadMovimiento } from '../a2d/entities/movement.entity';
import { EntidadArea } from '../areas/entities/area.entity';
import { EntidadPersonal } from './entities/personal.entity';
import { VistaIntervalosAsistenciaDiaria } from './entities/daily-attendance-interval.view';
import { VistaResumenAsistenciaDiaria } from './entities/daily-attendance-summary.view';
import { ControladorPersonal } from './personal.controller';
import { ServicioPersonal } from './personal.service';

@Module({
  imports: [
    ModuloA2D,
    UsersModule,
    TypeOrmModule.forFeature([
      EntidadPersonal,
      EntidadArea,
      EntidadMovimiento,
      VistaIntervalosAsistenciaDiaria,
      VistaResumenAsistenciaDiaria,
    ]),
  ],
  controllers: [ControladorPersonal],
  providers: [ServicioPersonal],
  exports: [ServicioPersonal],
})
export class ModuloPersonal {}
