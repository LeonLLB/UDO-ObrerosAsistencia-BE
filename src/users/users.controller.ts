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
export class UsersController {
  constructor(private readonly servicioUsuarios: UsersService) {}

  @Post()
  @UseGuards(GuardiaSesion, GuardiaAdmin)
  crear(@Body() dto: CrearUsuarioDto) {
    return this.servicioUsuarios.crear(dto);
  }

  @Get()
  @UseGuards(GuardiaSesion, GuardiaAdmin)
  buscarTodos() {
    return this.servicioUsuarios.buscarTodos();
  }

  @Get(':cedula/status')
  obtenerStatus(@Param('cedula') cedula: string) {
    return this.servicioUsuarios.obtenerStatus(cedula);
  }

  @Get(':cedula')
  @UseGuards(GuardiaSesion, GuardiaAdmin)
  buscarPorCedula(@Param('cedula') cedula: string) {
    return this.servicioUsuarios.buscarPorCedula(cedula);
  }

  

  @Put(':cedula')
  @UseGuards(GuardiaSesion, GuardiaAdmin)
  actualizar(
    @Param('cedula') cedula: string,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.servicioUsuarios.actualizar(cedula, dto);
  }

  @Put(':cedula/clave')
  @UseGuards(GuardiaSesion, GuardiaAdmin)
  reiniciarClave(@Param('cedula') cedula: string) {
    return this.servicioUsuarios.reiniciarClave(cedula);
  }

  @Delete(':cedula')
  @HttpCode(204)
  @UseGuards(GuardiaSesion, GuardiaAdmin)
  eliminar(
    @Param('cedula') cedula: string,
    @Req() request: RequestAutenticado,
  ) {
    return this.servicioUsuarios.eliminar(cedula, request.user!.cedula);
  }
}
