import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CrearAreaDto } from './dto/create-area.dto';
import { ActualizarAreaDto } from './dto/update-area.dto';
import { ServicioAreas } from './areas.service';

@Controller('areas')
export class ControladorAreas {
  constructor(private readonly servicioAreas: ServicioAreas) {}

  @Post()
  crear(@Body() dto: CrearAreaDto) {
    return this.servicioAreas.crear(dto);
  }

  @Get()
  buscarTodas() {
    return this.servicioAreas.buscarTodas();
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.servicioAreas.buscarPorId(id);
  }

  @Put(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarAreaDto,
  ) {
    return this.servicioAreas.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.servicioAreas.eliminar(id);
  }
}
