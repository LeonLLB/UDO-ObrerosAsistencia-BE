import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class SoloServidorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (
      process.env.NODE_ENV === 'dev' ||
      process.env.NODE_ENV === 'development'
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (request.ip === '::1' || request.ip === '::ffff:127.0.0.1') {
      throw new ForbiddenException(
        'La revalidación solo puede ejecutarse desde el servidor',
      );
    }

    return true;
  }
}
