import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { EstadoSesion, RolUsuario, UsuarioDTO } from '@smartcart/compartido';
import {
  api,
  fijarToken,
  RespuestaAuth,
  ResultadoPago,
  SesionConCarrito,
} from './src/api/cliente';
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
import { PantallaEgreso } from './src/pantallas/PantallaEgreso';
import { PantallaOperador } from './src/pantallas/PantallaOperador';
import { PantallaSucursales } from './src/pantallas/PantallaSucursales';
import { colores } from './src/tema';

/** Datos mínimos para mostrar el QR de egreso tras un pago aprobado. */
interface EgresoPendiente {
  sesionId: string;
  codigoEgreso: string;
  totalCentavos: number;
}

/**
 * Orquestador de la app: decide la pantalla según rol y estado.
 *   sin usuario → Acceso
 *   OPERADOR_EGRESO → Operador (escanear QR y validar)
 *   cliente → Sucursales → Compra → Egreso (QR)
 * Al arrancar restaura login y compra/egreso en curso desde AsyncStorage
 * (el carrito vive en el backend; reabrir la app no pierde nada).
 */
export default function App() {
  const [restaurando, setRestaurando] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioDTO | null>(null);
  const [compra, setCompra] = useState<SesionConCarrito | null>(null);
  const [egreso, setEgreso] = useState<EgresoPendiente | null>(null);

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
            } else if (sesion.estado === EstadoSesion.PAGADA && sesion.codigoEgreso) {
              // Pagó y cerró la app antes de validar: se restaura el QR.
              setEgreso({
                sesionId: sesion.id,
                codigoEgreso: sesion.codigoEgreso,
                totalCentavos: sesion.totalCentavos,
              });
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
    setEgreso(null);
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

  const alPagar = (resultado: ResultadoPago) => {
    if (!resultado.codigoEgreso) return;
    // El id de sesión queda guardado: si cierra la app, vuelve al QR.
    setCompra(null);
    setEgreso({
      sesionId: resultado.sesionId,
      codigoEgreso: resultado.codigoEgreso,
      totalCentavos: resultado.totalCentavos,
    });
  };

  const alTerminarEgreso = async () => {
    await limpiarSesionCompraId();
    setEgreso(null);
  };

  if (restaurando) {
    return (
      <View style={estilos.cargando}>
        <ActivityIndicator size="large" color={colores.primario} />
      </View>
    );
  }

  const pantalla = !usuario ? (
    <PantallaAcceso alIngresar={alIngresar} />
  ) : usuario.rol === RolUsuario.OPERADOR_EGRESO ? (
    <PantallaOperador nombreOperador={usuario.nombre} alSalir={alSalir} />
  ) : egreso ? (
    <PantallaEgreso
      sesionId={egreso.sesionId}
      codigoEgreso={egreso.codigoEgreso}
      totalCentavos={egreso.totalCentavos}
      alTerminar={alTerminarEgreso}
    />
  ) : compra ? (
    <PantallaCompra sesionInicial={compra} alTerminar={alTerminarCompra} alPagar={alPagar} />
  ) : (
    <PantallaSucursales
      nombreUsuario={usuario.nombre}
      alIniciarCompra={alIniciarCompra}
      alSalir={alSalir}
    />
  );

  return (
    <>
      {pantalla}
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
