import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersStatusController {
  constructor(private readonly servicioUsuarios: UsersService) {}

  @Get(':cedula/status')
  obtenerStatus(@Param('cedula') cedula: string) {
    return this.servicioUsuarios.obtenerStatus(cedula);
  }
}
