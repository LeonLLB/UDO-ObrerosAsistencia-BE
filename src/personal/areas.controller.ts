import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CrearAreaDto } from './dto/create-area.dto';
import { ActualizarAreaDto } from './dto/update-area.dto';
import { ServicioPersonal } from './personal.service';

@Controller('areas')
export class ControladorAreas {
  constructor(private readonly servicioPersonal: ServicioPersonal) {}

  @Post()
  crear(@Body() dto: CrearAreaDto) {
    return this.servicioPersonal.crearArea(dto);
  }

  @Get()
  buscarTodas() {
    return this.servicioPersonal.buscarTodasLasAreas();
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.servicioPersonal.buscarAreaPorId(id);
  }

  @Put(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarAreaDto,
  ) {
    return this.servicioPersonal.actualizarArea(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.servicioPersonal.eliminarArea(id);
  }
}
