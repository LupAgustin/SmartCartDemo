import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma compartido por toda la app.
 * IMPORTANTE: las queries sobre entidades de negocio deben filtrar
 * siempre por tenant usando el helper `conTenant` (ver comun/tenant).
 */
@Injectable()
export class PrismaServicio extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
