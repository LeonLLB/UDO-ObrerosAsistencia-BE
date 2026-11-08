import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { RequestAutenticado } from '../users/guards/session.guard';
import { obtenerCookiesRedactadas } from '../users/auth-cookies';
import { EntidadSeguimiento } from './entities/seguimiento.entity';
import { SeguimientoService } from './seguimiento.service';

const CAMPOS_SENSIBLES = /clave|password|token|authorization|cookie|secret/i;

function redactar(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(redactar);
  }

  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, contenido]) => [
        clave,
        CAMPOS_SENSIBLES.test(clave) ? '[REDACTED]' : redactar(contenido),
      ]),
    );
  }

  return valor;
}

@Injectable()
export class SeguimientoMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Seguimiento');

  constructor(private readonly servicioSeguimiento: SeguimientoService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const inicio = Date.now();
    const fecha = new Date();

    response.on('finish', () => {
      if (request.url.includes('reval') || request.url.includes('test')) return;

      const esPdf = String(response.getHeader('content-type') ?? '').includes(
        'pdf',
      );
      if (request.method === 'GET' && !esPdf) return;

      const requestAutenticado = request as RequestAutenticado;
      const ip = request.ip || '0.0.0.0';
      const execTime = Date.now() - inicio;
      const seguimiento: Partial<EntidadSeguimiento> = {
        ip,
        method: request.method,
        url: request.path,
        body: (redactar(request.body) ?? null) as
          Record<string, unknown> | unknown[] | null,
        headers: redactar(request.headers) as Record<string, unknown>,
        cookies: obtenerCookiesRedactadas(request),
        params: redactar(request.params) as Record<string, unknown>,
        date: fecha,
        responseCode: response.statusCode,
        execTime,
      };

      void this.servicioSeguimiento
        .registrar(seguimiento, requestAutenticado.user?.id)
        .catch((error: unknown) => {
          const detalle = error instanceof Error ? error.stack : String(error);
          this.logger.error(
            'No se pudo guardar el registro de seguimiento',
            detalle,
          );
        });

      const contentLength = Number(response.getHeader('content-length') ?? 0);
      this.logger.log(
        [
          requestAutenticado.user?.cedula ?? '--',
          ip,
          request.method,
          request.url,
          response.statusCode,
          `${(contentLength / 1024).toFixed(3)}Kb`,
          `${(execTime / 1000).toFixed(3)}s`,
        ].join(' '),
      );
    });

    next();
  }
}
