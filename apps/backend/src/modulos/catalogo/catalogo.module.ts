import { Module } from '@nestjs/common';

/**
 * Módulo de catálogo: cache propio en Postgres del catálogo del súper,
 * sincronizado por job programado a través de un adaptador de fuente
 * (ver adaptadores/adaptador-fuente-catalogo.ts).
 * Sprint 1: consulta por EAN, importador CSV/SFTP, alertas de producto
 * desconocido. Búsqueda por nombre si sobra tiempo (Should).
 */
@Module({})
export class CatalogoModule {}
