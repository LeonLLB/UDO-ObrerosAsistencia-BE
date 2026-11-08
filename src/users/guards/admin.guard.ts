import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { RequestAutenticado } from './session.guard';
import { TipoUsuario } from '../tipo-usuario';

@Injectable()
export class GuardiaAdmin implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestAutenticado>();

    if (request.user?.tipo !== TipoUsuario.ADMIN) {
      throw new ForbiddenException('Se requiere una cuenta Administrador');
    }
    return true;
  }
}
