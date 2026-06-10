import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosServicio } from './pagos.servicio';
import { PROVEEDOR_DE_PAGO } from './proveedor-de-pago';
import { ProveedorDePagoSimulado } from './proveedor-simulado';

/**
 * Módulo de pagos: la lógica de negocio habla solo con la interfaz
 * ProveedorDePago. La demo usa el proveedor simulado; Mercado Pago
 * sandbox se enchufa cambiando SOLO la línea del provider.
 * El pago exige conexión: no se encola offline.
 */
@Module({
  controllers: [PagosController],
  providers: [
    PagosServicio,
    // Para usar Mercado Pago real se cambia SOLO esta línea.
    { provide: PROVEEDOR_DE_PAGO, useClass: ProveedorDePagoSimulado },
  ],
})
export class PagosModule {}
