import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  NOMBRE_COOKIE_SESION,
  OPCIONES_COOKIE,
  OPCIONES_COOKIE_SESION,
  obtenerCookie,
} from './auth-cookies';
import { LoginDto } from './dtos/login.dto';
import { SoloServidorGuard } from './guards/solo-servidor.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly servicioAuth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const resultado = await this.servicioAuth.login(dto);
    response.cookie(
      NOMBRE_COOKIE_SESION,
      resultado.token,
      OPCIONES_COOKIE_SESION,
    );
    return {
      message: 'Sesión iniciada correctamente',
      ...resultado,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = obtenerCookie(request, NOMBRE_COOKIE_SESION);
    if (token) {
      await this.servicioAuth.logout(token);
    }
    response.clearCookie(NOMBRE_COOKIE_SESION, OPCIONES_COOKIE);
    return { message: 'Sesión cerrada correctamente' };
  }

  @Get('revalidate/:TOKEN')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SoloServidorGuard)
  async revalidar(
    @Param('TOKEN') token: string,
  ) {
    const resultado = await this.servicioAuth.revalidar(token);
    
    return resultado;
  }
}
