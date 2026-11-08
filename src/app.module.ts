import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ModuloA2D } from './a2d/a2d.module';
import { PersonalAttendance1730676000000 } from './database/migrations/1730676000000-personal-attendance';
import { PersonalAttendanceViews1793740000000 } from './database/migrations/1793740000000-personal-attendance-views';
import { MigracionNombresEnEspanol1793740000001 } from './database/migrations/1793740000001-nombres-en-espanol';
import { UsersAndTracking1793938000000 } from './database/migrations/1793938000000-users-and-tracking';
import { UserStatus1793939000000 } from './database/migrations/1793939000000-user-status';
import { SeguimientoUserRelation1793940000000 } from './database/migrations/1793940000000-seguimiento-user-relation';
import { NullUserPassword1793941000000 } from './database/migrations/1793941000000-null-user-password';
import { ModuloPersonal } from './personal/personal.module';
import { SeguimientoMiddleware } from './seguimiento/seguimiento.middleware';
import { SeguimientoModule } from './seguimiento/seguimiento.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configuracion: ConfigService): TypeOrmModuleOptions => ({
        type: 'mariadb',
        host: configuracion.getOrThrow<string>('HOST_BD'),
        port: Number(configuracion.getOrThrow<string>('PUERTO_BD')),
        username: configuracion.getOrThrow<string>('USUARIO_BD'),
        password: configuracion.getOrThrow<string>('CLAVE_BD'),
        database: configuracion.getOrThrow<string>('NOMBRE_BD'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [
          PersonalAttendance1730676000000,
          PersonalAttendanceViews1793740000000,
          MigracionNombresEnEspanol1793740000001,
          UsersAndTracking1793938000000,
          UserStatus1793939000000,
          SeguimientoUserRelation1793940000000,
          NullUserPassword1793941000000,
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    ModuloA2D,
    ModuloPersonal,
    SeguimientoModule,
    UsersModule,
  ],
  providers: [SeguimientoMiddleware],
})
export class ModuloAplicacion implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SeguimientoMiddleware).forRoutes('*');
  }
}
