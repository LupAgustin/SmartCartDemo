/**
 * Contrato del proveedor de pagos (PaymentProvider).
 *
 * Decisión de arquitectura: la lógica de negocio nunca conoce a Mercado
 * Pago directamente; habla con esta interfaz. Así se suman otras
 * billeteras sin tocar el flujo de compra.
 *
 * Implementación del MVP (Sprint 3): Mercado Pago en modo sandbox.
 * // TODO: integración real — credenciales productivas de Mercado Pago.
 */

export interface PreferenciaDePago {
  sesionId: string;
  tenantId: string;
  montoCentavos: number;
  descripcion: string;
}

export interface ResultadoCreacionPago {
  /** ID de la operación en el proveedor externo. */
  referenciaExterna: string;
  /** URL o deep link para completar el pago en la app. */
  urlPago: string;
}

export interface NotificacionDePago {
  referenciaExterna: string;
  estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
  /** Payload crudo del proveedor, se persiste para auditoría. */
  payloadCrudo: unknown;
}

export interface ProveedorDePago {
  /** Identificador del proveedor (ej: 'mercadopago'). */
  readonly nombre: string;

  /** Crea la intención de pago y devuelve cómo completarla. */
  crearPago(preferencia: PreferenciaDePago): Promise<ResultadoCreacionPago>;

  /** Interpreta una notificación entrante (webhook) del proveedor. */
  procesarNotificacion(payload: unknown): Promise<NotificacionDePago>;
}

/** Token de inyección para el proveedor de pago activo. */
export const PROVEEDOR_DE_PAGO = Symbol('PROVEEDOR_DE_PAGO');
