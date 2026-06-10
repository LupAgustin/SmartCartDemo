/**
 * Helpers de aislamiento multi-tenant.
 *
 * Regla de oro: NINGUNA query sobre entidades de negocio se ejecuta sin
 * filtrar por tenant. Todos los repositorios/servicios deben construir sus
 * cláusulas `where` con `conTenant(...)` en lugar de armarlas a mano.
 */

/** Error de programación: se intentó operar sin un tenant válido. */
export class ErrorTenantRequerido extends Error {
  constructor() {
    super('Operación sin tenant: toda query de negocio debe filtrar por tenant_id');
    this.name = 'ErrorTenantRequerido';
  }
}

/**
 * Mezcla el filtro de tenant dentro de una cláusula `where` de Prisma.
 *
 * - Lanza `ErrorTenantRequerido` si el tenantId viene vacío o sin contenido.
 * - Si el `where` recibido ya trae un `tenantId` (por bug o por input
 *   malicioso), se PISA con el tenant autenticado: el contexto de auth
 *   es la única fuente de verdad.
 */
export function conTenant<T extends Record<string, unknown>>(
  tenantId: string,
  where?: T,
): T & { tenantId: string } {
  if (typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new ErrorTenantRequerido();
  }
  return { ...(where ?? ({} as T)), tenantId };
}

/**
 * Igual que `conTenant` pero para datos de creación: garantiza que todo
 * registro nuevo nazca asociado al tenant autenticado.
 */
export function crearConTenant<T extends Record<string, unknown>>(
  tenantId: string,
  datos: T,
): T & { tenantId: string } {
  return conTenant(tenantId, datos);
}
