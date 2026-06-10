import { Injectable, Logger } from '@nestjs/common';

/**
 * Abstracción de analytics de producto.
 * El MVP usa una implementación no-op; en Fase 2 se enchufa PostHog
 * detrás de esta misma interfaz sin tocar la lógica de negocio.
 */
export interface ServicioAnalytics {
  registrarEvento(nombre: string, propiedades?: Record<string, unknown>): void;
}

@Injectable()
export class ServicioAnalyticsNoOp implements ServicioAnalytics {
  private readonly logger = new Logger('Analytics');

  registrarEvento(nombre: string, propiedades?: Record<string, unknown>): void {
    // TODO: integración real (PostHog, Fase 2)
    this.logger.debug(`Evento: ${nombre} ${JSON.stringify(propiedades ?? {})}`);
  }
}

/** Token de inyección para el servicio de analytics. */
export const SERVICIO_ANALYTICS = Symbol('SERVICIO_ANALYTICS');
