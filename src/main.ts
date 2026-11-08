import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ModuloAplicacion } from './app.module';

async function iniciarAplicacion() {
  const aplicacion = await NestFactory.create(ModuloAplicacion,
    {
    cors: {origin:(origin,cb)=>{
        if(process.env.NODE_ENV === "dev" || !origin ) return cb(null,true)
          console.log("CORS no valido",origin)
        return cb(new Error('CORS no valido'),false)
      },
    credentials:true}}
  );
  aplicacion.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await aplicacion.listen(process.env.PUERTO ?? 3000);
}
void iniciarAplicacion();
