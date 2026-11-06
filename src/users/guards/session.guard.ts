import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import { NOMBRE_COOKIE_SESION, obtenerCookie } from '../auth-cookies';

export type RequestAutenticado = Request & {
  user?: Awaited<ReturnType<AuthService['validarToken']>>;
};

@Injectable()
export class GuardiaSesion implements CanActivate {
  constructor(private readonly servicioAuth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestAutenticado>();
    const token = obtenerCookie(request, NOMBRE_COOKIE_SESION);
    if (!token) {
      throw new UnauthorizedException('Debe iniciar sesión');
    }

    request.user = await this.servicioAuth.validarToken(token);
    return true;
  }
}
