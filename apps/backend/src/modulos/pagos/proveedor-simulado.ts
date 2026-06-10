import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  NotificacionDePago,
  PreferenciaDePago,
  ProveedorDePago,
  ResultadoCreacionPago,
} from './proveedor-de-pago';

/**
 * Proveedor de pago SIMULADO para la demo: aprueba sin red externa ni
 * credenciales. Mercado Pago sandbox se enchufa como segunda
 * implementación de ProveedorDePago cuando haya credenciales.
 * // TODO: integración real (Mercado Pago sandbox, Sprint 3+)
 *
 * Regla de simulación controlada: un total cuyos centavos terminan en
 * 99 se RECHAZA (ej: $1.234,99) — sirve para demostrar el camino de
 * pago fallido sin tocar código.
 */
@Injectable()
export class ProveedorDePagoSimulado implements ProveedorDePago {
  readonly nombre = 'simulado';
  private readonly logger = new Logger('PagoSimulado');

  /** Resultados pendientes de "notificar", indexados por referencia. */
  private readonly resultados = new Map<string, NotificacionDePago['estado']>();

  async crearPago(preferencia: PreferenciaDePago): Promise<ResultadoCreacionPago> {
    const referenciaExterna = `SIM-${randomUUID()}`;
    const rechazado = preferencia.montoCentavos % 100 === 99;
    this.resultados.set(referenciaExterna, rechazado ? 'RECHAZADO' : 'APROBADO');
    this.logger.log(
      `Pago ${referenciaExterna} por ${preferencia.montoCentavos} centavos → ${
        rechazado ? 'RECHAZADO' : 'APROBADO'
      } (simulado)`,
    );
    return {
      referenciaExterna,
      // En un proveedor real acá viene el checkout; el simulado resuelve in-app.
      urlPago: `smartcart://pago-simulado/${referenciaExterna}`,
    };
  }

  /**
   * En un proveedor real esto interpreta el webhook. El simulado
   * "notifica" de inmediato el resultado decidido al crear el pago.
   */
  async procesarNotificacion(payload: unknown): Promise<NotificacionDePago> {
    const { referenciaExterna } = payload as { referenciaExterna: string };
    const estado = this.resultados.get(referenciaExterna) ?? 'RECHAZADO';
    this.resultados.delete(referenciaExterna);
    return { referenciaExterna, estado, payloadCrudo: payload };
  }
}
