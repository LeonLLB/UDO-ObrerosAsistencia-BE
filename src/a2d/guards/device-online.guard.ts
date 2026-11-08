import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ServicioA2D } from '../a2d.service';

@Injectable()
export class GuardiaDispositivoDisponible implements CanActivate {
  constructor(private readonly servicioA2D: ServicioA2D) {}

  async canActivate(): Promise<boolean> {
    if (!(await this.servicioA2D.verificarDispositivoDisponible())) {
      throw new ServiceUnavailableException(
        'El captahuella no está disponible; no se realizaron cambios en el personal',
      );
    }
    return true;
  }
}
