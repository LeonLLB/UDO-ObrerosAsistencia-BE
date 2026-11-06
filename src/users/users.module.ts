import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionRenewalInterceptor } from './interceptors/session-renewal.interceptor';
import { EntidadUsuario } from './entities/user.entity';
import { GuardiaAdmin } from './guards/admin.guard';
import { GuardiaSesion } from './guards/session.guard';
import { UsersController } from './users.controller';
import { UsersStatusController } from './user-status.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EntidadUsuario]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '20m' },
      }),
    }),
  ],
  controllers: [AuthController, UsersController, UsersStatusController],
  providers: [
    AuthService,
    UsersService,
    GuardiaSesion,
    GuardiaAdmin,
    {
      provide: APP_INTERCEPTOR,
      useClass: SessionRenewalInterceptor,
    },
  ],
  exports: [AuthService, UsersService],
})
export class UsersModule {}
