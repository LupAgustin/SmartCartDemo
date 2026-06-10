import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { cargarEntorno } from './config/entorno';
import { inicializarSentry } from './observabilidad/sentry';

async function arrancar() {
  // Validamos el entorno antes que nada: si falta una variable
  // obligatoria, el proceso falla acá con un mensaje claro.
  const entorno = cargarEntorno();
  inicializarSentry(entorno);

  const app = await NestFactory.create(AppModule);

  // CORS abierto en dev para el panel (Vite) y herramientas locales.
  // TODO: restringir orígenes en staging/producción.
  app.enableCors();

  await app.listen(entorno.PUERTO);
  Logger.log(
    `Backend SmartCart escuchando en http://localhost:${entorno.PUERTO} (ambiente: ${entorno.NODE_ENV})`,
    'Arranque',
  );
}

arrancar();
