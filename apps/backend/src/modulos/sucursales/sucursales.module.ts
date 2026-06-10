import { Module } from '@nestjs/common';
import { SucursalesController } from './sucursales.controller';

/**
 * Módulo de sucursales: listado para selección manual y datos de
 * geofence (lat/long/radio) que consume la app móvil.
 * Sprint 4: configuración de sucursales desde el panel B2B.
 */
@Module({
  controllers: [SucursalesController],
})
export class SucursalesModule {}
