import { z } from 'zod';

/**
 * Esquema de variables de entorno del backend.
 * Falla rápido al arrancar si falta algo obligatorio o tiene formato inválido.
 */
const esquemaEntorno = z.object({
  NODE_ENV: z.enum(['dev', 'staging', 'production']).default('dev'),
  PUERTO: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL debe ser una URL de conexión a PostgreSQL' }),
  JWT_SECRETO: z.string().min(16, 'JWT_SECRETO debe tener al menos 16 caracteres'),
  // Opcionales: si están vacíos, las integraciones quedan deshabilitadas en dev.
  SENTRY_DSN: z.string().optional().or(z.literal('')),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional().or(z.literal('')),
  /**
   * Carpeta/archivo de donde el adaptador CSV lee el catálogo.
   * En el piloto real esto apunta al drop-zone del SFTP del súper.
   * // TODO: integración real (SFTP)
   */
  CATALOGO_CSV_RUTA: z.string().default('../../infra/seed/catalogo-demo.csv'),
});

export type Entorno = z.infer<typeof esquemaEntorno>;

let entornoCacheado: Entorno | undefined;

/** Carga y valida el entorno (una sola vez por proceso). */
export function cargarEntorno(fuente: NodeJS.ProcessEnv = process.env): Entorno {
  if (!entornoCacheado) {
    const resultado = esquemaEntorno.safeParse(fuente);
    if (!resultado.success) {
      const detalles = resultado.error.issues
        .map((p) => `  - ${p.path.join('.')}: ${p.message}`)
        .join('\n');
      throw new Error(`Configuración de entorno inválida:\n${detalles}`);
    }
    entornoCacheado = resultado.data;
  }
  return entornoCacheado;
}

/** Solo para tests: limpia el cache del entorno. */
export function reiniciarEntornoParaTests(): void {
  entornoCacheado = undefined;
}
