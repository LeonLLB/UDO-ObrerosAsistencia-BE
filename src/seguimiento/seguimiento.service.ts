import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntidadHealth } from './entities/health.entity';
import { EntidadSeguimiento } from './entities/seguimiento.entity';

@Injectable()
export class SeguimientoService {
  private readonly logger = new Logger('Seguimiento');

  constructor(
    @InjectRepository(EntidadSeguimiento)
    private readonly repositorioSeguimientos: Repository<EntidadSeguimiento>,
    @InjectRepository(EntidadHealth)
    private readonly repositorioHealth: Repository<EntidadHealth>,
  ) {}

  registrar(
    seguimiento: Partial<EntidadSeguimiento>,
  ): Promise<EntidadSeguimiento> {
    return this.repositorioSeguimientos.save(
      this.repositorioSeguimientos.create(seguimiento),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSisHealthStatus(): Promise<void> {
    try {
      await fetch('https://ismyinternetworking.com/');
      await this.repositorioHealth.save({ status: 1, motivo: null });
      this.logger.log('Conexión a Internet disponible');
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      this.logger.warn(detalle);
      await this.repositorioHealth.save({
        status: 9,
        motivo: 'PERDIDA DE CONEXIÓN A INTERNET',
      });
    }
  }
}
