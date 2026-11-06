import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, from } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import {
  NOMBRE_COOKIE_SESION,
  OPCIONES_COOKIE_SESION,
  obtenerCookie,
} from '../auth-cookies';
import type { RequestAutenticado } from '../guards/session.guard';

@Injectable()
export class SessionRenewalInterceptor implements NestInterceptor {
  constructor(private readonly servicioAuth: AuthService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestAutenticado>();
    const response = http.getResponse<Response>();
    const token = obtenerCookie(request, NOMBRE_COOKIE_SESION);
    const metodosQueRenuevan = ['POST', 'PUT', 'DELETE'];
    const rutasExcluidas = ['/auth/login', '/auth/logout'];

    if (
      !metodosQueRenuevan.includes(request.method) ||
      !token ||
      rutasExcluidas.includes(request.path)
    ) {
      return next.handle();
    }

    return from(this.servicioAuth.validarToken(token)).pipe(
      concatMap((usuario) => {
        request.user = usuario;
        return next.handle().pipe(
          concatMap((resultado: unknown) =>
            from(this.servicioAuth.revalidar(token)).pipe(
              map(({ newToken }) => {
                response.cookie(
                  NOMBRE_COOKIE_SESION,
                  newToken,
                  OPCIONES_COOKIE_SESION,
                );
                return resultado;
              }),
            ),
          ),
        );
      }),
    );
  }
}
