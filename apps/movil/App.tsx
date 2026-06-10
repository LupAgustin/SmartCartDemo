import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { EstadoSesion, UsuarioDTO } from '@smartcart/compartido';
import { api, fijarToken, RespuestaAuth, SesionConCarrito } from './src/api/cliente';
import {
  guardarSesionCompraId,
  guardarSesionUsuario,
  leerSesionCompraId,
  leerSesionUsuario,
  limpiarSesionCompraId,
  limpiarTodo,
} from './src/almacen/sesion-local';
import { PantallaAcceso } from './src/pantallas/PantallaAcceso';
import { PantallaCompra } from './src/pantallas/PantallaCompra';
import { PantallaSucursales } from './src/pantallas/PantallaSucursales';
import { colores } from './src/tema';

/**
 * Orquestador de la app: decide qué pantalla mostrar según el estado.
 *   sin usuario → Acceso · con usuario → Sucursales · con compra activa → Compra
 * Al arrancar restaura el login y la compra en curso desde AsyncStorage
 * (el carrito vive en el backend; reabrir la app no lo pierde).
 */
export default function App() {
  const [restaurando, setRestaurando] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioDTO | null>(null);
  const [compra, setCompra] = useState<SesionConCarrito | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const guardada = await leerSesionUsuario();
        if (!guardada) return;
        fijarToken(guardada.token);
        setUsuario(guardada.usuario);

        const sesionCompraId = await leerSesionCompraId();
        if (sesionCompraId) {
          try {
            const sesion = await api.obtenerSesion(sesionCompraId);
            if (sesion.estado === EstadoSesion.ACTIVA) {
              setCompra(sesion);
            } else {
              await limpiarSesionCompraId();
            }
          } catch {
            // Sesión vieja, token vencido o backend inaccesible: se sigue sin compra.
            await limpiarSesionCompraId();
          }
        }
      } finally {
        setRestaurando(false);
      }
    })();
  }, []);

  const alIngresar = async (respuesta: RespuestaAuth) => {
    fijarToken(respuesta.token);
    await guardarSesionUsuario({ token: respuesta.token, usuario: respuesta.usuario });
    setUsuario(respuesta.usuario);
  };

  const alSalir = async () => {
    fijarToken(null);
    await limpiarTodo();
    setCompra(null);
    setUsuario(null);
  };

  const alIniciarCompra = async (sesion: SesionConCarrito) => {
    await guardarSesionCompraId(sesion.id);
    setCompra(sesion);
  };

  const alTerminarCompra = async () => {
    await limpiarSesionCompraId();
    setCompra(null);
  };

  if (restaurando) {
    return (
      <View style={estilos.cargando}>
        <ActivityIndicator size="large" color={colores.primario} />
      </View>
    );
  }

  return (
    <>
      {!usuario ? (
        <PantallaAcceso alIngresar={alIngresar} />
      ) : compra ? (
        <PantallaCompra sesionInicial={compra} alTerminar={alTerminarCompra} />
      ) : (
        <PantallaSucursales
          nombreUsuario={usuario.nombre}
          alIniciarCompra={alIniciarCompra}
          alSalir={alSalir}
        />
      )}
      <StatusBar style="dark" />
    </>
  );
}

const estilos = StyleSheet.create({
  cargando: {
    flex: 1,
    backgroundColor: colores.fondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
