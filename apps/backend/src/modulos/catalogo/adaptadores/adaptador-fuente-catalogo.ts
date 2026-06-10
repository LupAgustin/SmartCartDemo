/**
 * Contrato del adaptador de fuente de catálogo.
 *
 * Decisión de arquitectura: el catálogo se cachea en nuestra base y se
 * sincroniza desde la fuente del súper a través de esta interfaz común,
 * para no quedar atados a un ERP antes del piloto.
 *
 * - MVP: adaptador CSV/SFTP (se implementa en Sprint 1).
 * - REST y webhook: solo firmas, se implementan cuando un piloto lo pida.
 */

/** Un producto tal como viene de la fuente externa, ya normalizado. */
export interface ProductoFuente {
  ean: string;
  nombre: string;
  marca?: string;
  precioCentavos: number;
  /** false = el súper dio de baja el producto. */
  activo: boolean;
}

/** Resultado de una corrida de sincronización, para métricas y auditoría. */
export interface ResultadoSincronizacion {
  altas: number;
  bajas: number;
  cambiosDePrecio: number;
  sinCambios: number;
  errores: string[];
  duracionMs: number;
}

/** Contrato común a toda fuente de catálogo. */
export interface AdaptadorFuenteCatalogo {
  /** Identificador de la fuente (ej: 'CSV_SFTP', 'REST', 'WEBHOOK'). */
  readonly fuente: string;

  /**
   * Obtiene el catálogo completo (o el delta, según la fuente) listo
   * para reconciliar contra nuestro cache.
   */
  obtenerProductos(tenantId: string): Promise<ProductoFuente[]>;
}

// --- Firmas listas para Fase 2 (NO implementar todavía) ---

/**
 * Adaptador REST: consulta la API del ERP del súper.
 * // TODO: integración real — implementar cuando un piloto exponga API REST.
 */
export interface AdaptadorRest extends AdaptadorFuenteCatalogo {
  configurar(opciones: { urlBase: string; apiKey: string }): void;
}

/**
 * Adaptador webhook: el ERP del súper nos empuja los cambios.
 * // TODO: integración real — implementar cuando un piloto soporte webhooks.
 */
export interface AdaptadorWebhook extends AdaptadorFuenteCatalogo {
  /** Procesa un payload entrante y lo convierte a productos normalizados. */
  procesarPayload(payload: unknown, firma: string): Promise<ProductoFuente[]>;
}
