import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntidadHealth } from './entities/health.entity';
import { EntidadSeguimiento } from './entities/seguimiento.entity';
import { SeguimientoService } from './seguimiento.service';

@Module({
  imports: [TypeOrmModule.forFeature([EntidadHealth, EntidadSeguimiento])],
  providers: [SeguimientoService],
  exports: [SeguimientoService],
})
export class SeguimientoModule {}
