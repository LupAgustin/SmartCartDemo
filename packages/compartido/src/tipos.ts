import { EstadoPago, EstadoSesion, ResultadoValidacion, RolUsuario } from './enums';

/**
 * Contratos de la API que comparten backend, app móvil y panel.
 * Los montos siempre se expresan en centavos de ARS (enteros) para
 * evitar errores de punto flotante.
 */

export interface TenantDTO {
  id: string;
  nombre: string;
  slug: string;
  activo: boolean;
}

export interface SucursalDTO {
  id: string;
  tenantId: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  /** Radio del geofence en metros (default de negocio: 50). */
  radioGeofenceMetros: number;
  activa: boolean;
}

export interface UsuarioDTO {
  id: string;
  tenantId: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
}

export interface ProductoCatalogoDTO {
  id: string;
  tenantId: string;
  ean: string;
  nombre: string;
  marca: string | null;
  /** Precio vigente en centavos de ARS. */
  precioActualCentavos: number;
  activo: boolean;
}

export interface EventoDeEscaneoDTO {
  id: string;
  sesionId: string;
  productoId: string;
  ean: string;
  nombreProducto: string;
  /**
   * Snapshot del precio al momento del escaneo, en centavos.
   * Regla de negocio: este es el precio que se cobra, aunque el
   * catálogo cambie antes del pago.
   */
  snapshotPrecioCentavos: number;
  cantidad: number;
  escaneadoEn: string;
}

export interface SesionDeCompraDTO {
  id: string;
  tenantId: string;
  sucursalId: string;
  usuarioId: string;
  estado: EstadoSesion;
  /** Total acumulado en centavos (suma de snapshots × cantidad). */
  totalCentavos: number;
  eventos: EventoDeEscaneoDTO[];
  iniciadaEn: string;
}

export interface TransaccionDePagoDTO {
  id: string;
  tenantId: string;
  sesionId: string;
  proveedor: string;
  estado: EstadoPago;
  montoCentavos: number;
  referenciaExterna: string | null;
  creadaEn: string;
}

export interface ValidacionDeEgresoDTO {
  id: string;
  tenantId: string;
  sesionId: string;
  operadorId: string;
  resultado: ResultadoValidacion;
  observaciones: string | null;
  validadaEn: string;
}
