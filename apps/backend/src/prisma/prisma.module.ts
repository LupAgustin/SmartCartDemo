import { Global, Module } from '@nestjs/common';
import { PrismaServicio } from './prisma.servicio';

/** Módulo global: expone el cliente Prisma a todos los módulos de negocio. */
@Global()
@Module({
  providers: [PrismaServicio],
  exports: [PrismaServicio],
})
export class PrismaModule {}
