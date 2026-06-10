import { Controller, Get } from '@nestjs/common';
import { PrismaServicio } from '../prisma/prisma.servicio';

/**
 * Endpoint de salud para monitoreo y para verificar el arranque local.
 * GET /salud → estado del proceso y de la conexión a la base.
 */
@Controller('salud')
export class SaludController {
  constructor(private readonly prisma: PrismaServicio) {}

  @Get()
  async verificar() {
    let baseDeDatos: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      baseDeDatos = 'error';
    }
    return {
      estado: 'ok',
      baseDeDatos,
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
