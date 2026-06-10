import { Module } from '@nestjs/common';

/**
 * Módulo de sesión de compra: el corazón del flujo scan & go.
 * Sprint 1: iniciar/cerrar sesión, registrar eventos de escaneo con
 * SNAPSHOT DE PRECIO (regla de negocio: se cobra el precio del momento
 * del escaneo, no el de góndola al pagar), total acumulado.
 */
@Module({})
export class SesionCompraModule {}
