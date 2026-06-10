import { ProductoFuente } from './adaptadores/adaptador-fuente-catalogo';

/**
 * Lógica PURA de reconciliación entre el catálogo cacheado y la fuente.
 * Separada del acceso a datos para poder testearla de forma aislada.
 */

/** Lo mínimo que necesitamos del producto ya cacheado para comparar. */
export interface ProductoCacheado {
  ean: string;
  nombre: string;
  marca: string | null;
  precioActualCentavos: number;
  activo: boolean;
}

export interface PlanDeSincronizacion {
  /** Productos nuevos que hay que crear. */
  altas: ProductoFuente[];
  /** EANs que hay que desactivar (baja lógica, nunca borrado físico). */
  bajas: string[];
  /** Productos existentes con precio/datos distintos que hay que actualizar. */
  cambios: ProductoFuente[];
  sinCambios: number;
}

/**
 * Compara la fuente contra el cache y arma el plan de cambios.
 * Reglas:
 * - EAN en fuente pero no en cache → alta.
 * - EAN en cache (activo) pero ausente en la fuente → baja lógica.
 * - EAN en ambos con precio/nombre/marca/activo distinto → cambio.
 * - Un producto dado de baja que reaparece en la fuente → cambio (se reactiva).
 */
export function reconciliarCatalogo(
  cacheados: ProductoCacheado[],
  fuente: ProductoFuente[],
): PlanDeSincronizacion {
  const porEanCacheado = new Map(cacheados.map((p) => [p.ean, p]));
  const eansFuente = new Set(fuente.map((p) => p.ean));

  const plan: PlanDeSincronizacion = { altas: [], bajas: [], cambios: [], sinCambios: 0 };

  for (const productoFuente of fuente) {
    const cacheado = porEanCacheado.get(productoFuente.ean);
    if (!cacheado) {
      plan.altas.push(productoFuente);
      continue;
    }
    const cambio =
      cacheado.precioActualCentavos !== productoFuente.precioCentavos ||
      cacheado.nombre !== productoFuente.nombre ||
      (cacheado.marca ?? undefined) !== productoFuente.marca ||
      cacheado.activo !== productoFuente.activo;
    if (cambio) {
      plan.cambios.push(productoFuente);
    } else {
      plan.sinCambios++;
    }
  }

  for (const cacheado of cacheados) {
    if (cacheado.activo && !eansFuente.has(cacheado.ean)) {
      plan.bajas.push(cacheado.ean);
    }
  }

  return plan;
}
