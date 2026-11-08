import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ParametrosAsistenciaDiariaDto } from './dto/daily-attendance-params.dto';
import { ParametrosResumenAsistenciaDiariaDto } from './dto/daily-attendance-summary-params.dto';
import { CrearPersonalDto } from './dto/create-personal.dto';
import { ActualizarPersonalDto } from './dto/update-personal.dto';
import { GuardiaDispositivoDisponible } from '../a2d/guards/device-online.guard';
import { ServicioPersonal } from './personal.service';
import { GuardiaAdmin } from '../users/guards/admin.guard';
import { GuardiaSesion } from '../users/guards/session.guard';

@Controller('personal')
@UseGuards(GuardiaSesion)
export class ControladorPersonal {
  constructor(private readonly servicioPersonal: ServicioPersonal) {}

  @Post()
  @UseGuards(GuardiaAdmin, GuardiaDispositivoDisponible)
  crear(@Body() dto: CrearPersonalDto) {
    return this.servicioPersonal.crear(dto);
  }

  @Get()
  buscarTodos() {
    return this.servicioPersonal.buscarTodos();
  }

  @Get('asistencia/:fecha/resumen')
  obtenerResumenAsistenciaDiaria(
    @Param() parametros: ParametrosResumenAsistenciaDiariaDto,
  ) {
    return this.servicioPersonal.obtenerResumenAsistenciaDiaria(
      parametros.fecha,
    );
  }

  @Get(':id/asistencia/:fecha')
  obtenerAsistenciaDiaria(@Param() parametros: ParametrosAsistenciaDiariaDto) {
    return this.servicioPersonal.obtenerAsistenciaDiaria(
      parametros.id,
      parametros.fecha,
    );
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.servicioPersonal.buscarPorId(id);
  }

  @Put(':id/toggle-status')
  @UseGuards(GuardiaAdmin, GuardiaDispositivoDisponible)
  toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.servicioPersonal.toggleStatus(id);
  }

  @Put(':id')
  @UseGuards(GuardiaAdmin, GuardiaDispositivoDisponible)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPersonalDto,
  ) {
    return this.servicioPersonal.actualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(GuardiaAdmin, GuardiaDispositivoDisponible)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.servicioPersonal.eliminar(id);
  }
}
