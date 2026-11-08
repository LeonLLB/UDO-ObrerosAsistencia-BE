import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { EstablecerClaveDto } from './dtos/set-password.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersStatusController {
  constructor(private readonly servicioUsuarios: UsersService) {}

  @Post('set-password')
  @HttpCode(HttpStatus.CREATED)
  establecerClave(@Body() dto: EstablecerClaveDto) {
    return this.servicioUsuarios.establecerClave(dto);
  }

  @Get(':cedula/status')
  obtenerStatus(@Param('cedula') cedula: string) {
    return this.servicioUsuarios.obtenerStatus(cedula);
  }
}
