import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GuardiaSesion } from './guards/session.guard';
import type { RequestAutenticado } from './guards/session.guard';
import { GuardiaAdmin } from './guards/admin.guard';
import { CrearUsuarioDto } from './dtos/create-user.dto';
import { ActualizarUsuarioDto } from './dtos/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(GuardiaSesion, GuardiaAdmin)
export class UsersController {
  constructor(private readonly servicioUsuarios: UsersService) {}

  @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.servicioUsuarios.crear(dto);
  }

  @Get()
  buscarTodos() {
    return this.servicioUsuarios.buscarTodos();
  }

  @Get(':cedula')
  buscarPorCedula(@Param('cedula') cedula: string) {
    return this.servicioUsuarios.buscarPorCedula(cedula);
  }

  @Put(':cedula')
  actualizar(
    @Param('cedula') cedula: string,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.servicioUsuarios.actualizar(cedula, dto);
  }

  @Put(':cedula/clave')
  reiniciarClave(@Param('cedula') cedula: string) {
    return this.servicioUsuarios.reiniciarClave(cedula);
  }

  @Delete(':cedula')
  @HttpCode(204)
  eliminar(
    @Param('cedula') cedula: string,
    @Req() request: RequestAutenticado,
  ) {
    return this.servicioUsuarios.eliminar(cedula, request.user!.cedula);
  }
}
