import AsyncStorage from '@react-native-async-storage/async-storage';
import { UsuarioDTO } from '@smartcart/compartido';

/**
 * Persistencia local de la sesión de usuario y de la compra en curso:
 * cerrar y reabrir la app no pierde ni el login ni el carrito
 * (el carrito real vive en el backend; acá solo guardamos los IDs).
 */

const CLAVE_TOKEN = '@smartcart/token';
const CLAVE_USUARIO = '@smartcart/usuario';
const CLAVE_SESION_COMPRA = '@smartcart/sesion-compra-id';

export interface SesionGuardada {
  token: string;
  usuario: UsuarioDTO;
}

export async function guardarSesionUsuario(datos: SesionGuardada): Promise<void> {
  await AsyncStorage.multiSet([
    [CLAVE_TOKEN, datos.token],
    [CLAVE_USUARIO, JSON.stringify(datos.usuario)],
  ]);
}

export async function leerSesionUsuario(): Promise<SesionGuardada | null> {
  const [[, token], [, usuarioCrudo]] = await AsyncStorage.multiGet([CLAVE_TOKEN, CLAVE_USUARIO]);
  if (!token || !usuarioCrudo) return null;
  try {
    return { token, usuario: JSON.parse(usuarioCrudo) as UsuarioDTO };
  } catch {
    return null;
  }
}

export async function guardarSesionCompraId(sesionId: string): Promise<void> {
  await AsyncStorage.setItem(CLAVE_SESION_COMPRA, sesionId);
}

export async function leerSesionCompraId(): Promise<string | null> {
  return AsyncStorage.getItem(CLAVE_SESION_COMPRA);
}

export async function limpiarSesionCompraId(): Promise<void> {
  await AsyncStorage.removeItem(CLAVE_SESION_COMPRA);
}

/** Logout: borra todo lo persistido. */
export async function limpiarTodo(): Promise<void> {
  await AsyncStorage.multiRemove([CLAVE_TOKEN, CLAVE_USUARIO, CLAVE_SESION_COMPRA]);
}
