import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicioA2D } from './a2d.service';
import { EntidadMovimiento } from './entities/movement.entity';
import { EntidadPersonal } from '../personal/entities/personal.entity';
import { GuardiaDispositivoDisponible } from './guards/device-online.guard';

@Module({
  imports: [TypeOrmModule.forFeature([EntidadMovimiento, EntidadPersonal])],
  providers: [ServicioA2D, GuardiaDispositivoDisponible],
  exports: [ServicioA2D, GuardiaDispositivoDisponible],
})
export class ModuloA2D {}
