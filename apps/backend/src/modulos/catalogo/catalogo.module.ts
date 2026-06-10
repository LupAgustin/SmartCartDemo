import { Module } from '@nestjs/common';
import { AdaptadorCsv } from './adaptadores/csv/adaptador-csv';
import { CatalogoController } from './catalogo.controller';
import { CatalogoServicio } from './catalogo.servicio';
import { ADAPTADOR_CATALOGO, SincronizacionServicio } from './sincronizacion.servicio';

/**
 * Módulo de catálogo: cache propio en Postgres del catálogo del súper,
 * sincronizado por job programado a través de un adaptador de fuente.
 * Fuente del MVP: CSV (drop-zone local; SFTP real en el piloto).
 * REST y webhook: solo firmas en adaptadores/adaptador-fuente-catalogo.ts.
 */
@Module({
  controllers: [CatalogoController],
  providers: [
    CatalogoServicio,
    SincronizacionServicio,
    // Para cambiar la fuente de catálogo se cambia SOLO esta línea.
    { provide: ADAPTADOR_CATALOGO, useClass: AdaptadorCsv },
  ],
  exports: [CatalogoServicio],
})
export class CatalogoModule {}
