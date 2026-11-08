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

  

  @Put(':id')
  @UseGuards(GuardiaSesion, GuardiaAdmin)
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.servicioUsuarios.actualizar(+id, dto);
  }

  @Put(':id/clave')
  @UseGuards(GuardiaSesion, GuardiaAdmin)
  reiniciarClave(@Param('id') id: string) {
    return this.servicioUsuarios.reiniciarClave(+id);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(GuardiaSesion, GuardiaAdmin)
  eliminar(
    @Param('id') id: number,
    @Req() request: RequestAutenticado,
  ) {
    return this.servicioUsuarios.eliminar(+id, request.user!.id);
  }
}
