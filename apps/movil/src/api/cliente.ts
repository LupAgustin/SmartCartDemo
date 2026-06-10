import {
  ProductoCatalogoDTO,
  SesionDeCompraDTO,
  SucursalDTO,
  UsuarioDTO,
} from '@smartcart/compartido';

/**
 * Cliente HTTP de la app móvil contra el backend SmartCart.
 *
 * La URL base sale de EXPO_PUBLIC_API_URL (ver .env.example): en un
 * dispositivo físico tiene que ser la IP LAN de la máquina que corre
 * el backend, no localhost.
 */
const URL_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Error de la API con status y cuerpo parseado (para leer códigos como PRODUCTO_DESCONOCIDO). */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly cuerpo: { codigo?: string; mensaje?: string; message?: string } | null,
  ) {
    super(cuerpo?.mensaje ?? cuerpo?.message ?? `Error HTTP ${status}`);
    this.name = 'ErrorApi';
  }
}

let tokenActual: string | null = null;

/** Fija el JWT que viaja en cada request (null = deslogueado). */
export function fijarToken(token: string | null): void {
  tokenActual = token;
}

async function pedir<T>(
  ruta: string,
  opciones: { metodo?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; cuerpo?: unknown } = {},
): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_BASE}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenActual ? { Authorization: `Bearer ${tokenActual}` } : {}),
      },
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    });
  } catch {
    // Sin red o backend caído: mensaje accionable para la demo.
    throw new ErrorApi(0, { mensaje: `No se pudo conectar al servidor (${URL_BASE})` });
  }
  const texto = await respuesta.text();
  const datos = texto ? JSON.parse(texto) : null;
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, datos);
  }
  return datos as T;
}

export interface RespuestaAuth {
  token: string;
  usuario: UsuarioDTO;
}

/** La sesión como la devuelve el backend: DTO + sucursal resumida. */
export type SesionConCarrito = SesionDeCompraDTO & {
  sucursal: { id: string; nombre: string };
};

export const api = {
  registrar: (datos: { tenantSlug: string; email: string; nombre: string; contrasena: string }) =>
    pedir<RespuestaAuth>('/auth/registro', { metodo: 'POST', cuerpo: datos }),

  ingresar: (datos: { tenantSlug: string; email: string; contrasena: string }) =>
    pedir<RespuestaAuth>('/auth/login', { metodo: 'POST', cuerpo: datos }),

  listarSucursales: () => pedir<SucursalDTO[]>('/sucursales'),

  iniciarSesionCompra: (sucursalId: string) =>
    pedir<SesionConCarrito>('/sesiones', { metodo: 'POST', cuerpo: { sucursalId } }),

  obtenerSesion: (sesionId: string) => pedir<SesionConCarrito>(`/sesiones/${sesionId}`),

  escanear: (sesionId: string, ean: string) =>
    pedir<SesionConCarrito>(`/sesiones/${sesionId}/escaneos`, {
      metodo: 'POST',
      cuerpo: { ean },
    }),

  actualizarCantidad: (sesionId: string, eventoId: string, cantidad: number) =>
    pedir<SesionConCarrito>(`/sesiones/${sesionId}/eventos/${eventoId}`, {
      metodo: 'PATCH',
      cuerpo: { cantidad },
    }),

  cancelarSesion: (sesionId: string) =>
    pedir<{ id: string; estado: string }>(`/sesiones/${sesionId}/cancelar`, { metodo: 'POST' }),

  buscarProductos: (texto: string) =>
    pedir<ProductoCatalogoDTO[]>(`/catalogo/productos?buscar=${encodeURIComponent(texto)}`),
};
