import * as Sentry from '@sentry/nestjs';
import { Logger } from '@nestjs/common';
import { Entorno } from '../config/entorno';

/**
 * Inicializa Sentry solo si hay DSN configurado.
 * En dev local suele estar vacío y el backend funciona igual.
 */
export function inicializarSentry(entorno: Entorno): void {
  if (!entorno.SENTRY_DSN) {
    Logger.log('Sentry deshabilitado (SENTRY_DSN vacío)', 'Observabilidad');
    return;
  }
  Sentry.init({
    dsn: entorno.SENTRY_DSN,
    environment: entorno.NODE_ENV,
    // Trazas al 10% para no inflar la cuota en el piloto.
    tracesSampleRate: 0.1,
  });
  Logger.log('Sentry inicializado', 'Observabilidad');
}
