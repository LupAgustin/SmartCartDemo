import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SucursalDTO } from '@smartcart/compartido';
import { api, SesionConCarrito } from '../api/cliente';
import { colores, espaciado } from '../tema';
import { sucursalEnRango } from '../utilidades/distancia';

interface Props {
  nombreUsuario: string;
  alIniciarCompra: (sesion: SesionConCarrito) => void;
  alSalir: () => void;
}

/**
 * Selección de sucursal: si la ubicación cae dentro del geofence de
 * una sucursal se la propone automáticamente; la lista completa queda
 * siempre disponible como respaldo manual (regla del brief).
 */
export function PantallaSucursales({ nombreUsuario, alIniciarCompra, alSalir }: Props) {
  const [sucursales, setSucursales] = useState<SucursalDTO[] | null>(null);
  const [detectada, setDetectada] = useState<SucursalDTO | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const lista = await api.listarSucursales();
        if (cancelado) return;
        setSucursales(lista);

        // Geofence: pedir ubicación es opcional — si el usuario la niega,
        // la selección manual sigue funcionando.
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (permiso.status === 'granted') {
          const posicion = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (cancelado) return;
          const enRango = sucursalEnRango(
            { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude },
            lista,
          );
          setDetectada(enRango ?? null);
        }
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : 'Error inesperado');
      } finally {
        if (!cancelado) setBuscandoUbicacion(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  const iniciar = async (sucursal: SucursalDTO) => {
    setError(null);
    setIniciando(sucursal.id);
    try {
      const sesion = await api.iniciarSesionCompra(sucursal.id);
      alIniciarCompra(sesion);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar la compra');
      setIniciando(null);
    }
  };

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.encabezado}>
        <View>
          <Text style={estilos.saludo}>Hola, {nombreUsuario} 👋</Text>
          <Text style={estilos.subtitulo}>¿Dónde estás comprando hoy?</Text>
        </View>
        <TouchableOpacity onPress={alSalir}>
          <Text style={estilos.salir}>Salir</Text>
        </TouchableOpacity>
      </View>

      {detectada && (
        <TouchableOpacity
          style={estilos.bannerGeofence}
          onPress={() => iniciar(detectada)}
          disabled={iniciando !== null}
        >
          <Text style={estilos.bannerTitulo}>📍 Estás en {detectada.nombre}</Text>
          <Text style={estilos.bannerAccion}>
            {iniciando === detectada.id ? 'Iniciando…' : 'Tocá para empezar a escanear →'}
          </Text>
        </TouchableOpacity>
      )}

      {buscandoUbicacion && !detectada && (
        <View style={estilos.buscando}>
          <ActivityIndicator color={colores.primario} />
          <Text style={estilos.buscandoTexto}>Detectando sucursal por ubicación…</Text>
        </View>
      )}

      {error && <Text style={estilos.error}>{error}</Text>}

      <Text style={estilos.tituloLista}>
        {detectada ? 'O elegí otra sucursal' : 'Elegí tu sucursal'}
      </Text>

      {sucursales === null ? (
        <ActivityIndicator color={colores.primario} style={{ marginTop: espaciado.grande }} />
      ) : (
        <FlatList
          data={sucursales}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={estilos.tarjetaSucursal}
              onPress={() => iniciar(item)}
              disabled={iniciando !== null}
            >
              <Text style={estilos.nombreSucursal}>{item.nombre}</Text>
              <Text style={estilos.direccion}>{item.direccion}</Text>
              {iniciando === item.id && (
                <ActivityIndicator color={colores.primario} style={{ marginTop: 4 }} />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
    padding: espaciado.medio,
    paddingTop: 60,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: espaciado.medio,
  },
  saludo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colores.texto,
  },
  subtitulo: {
    fontSize: 14,
    color: colores.textoSuave,
  },
  salir: {
    color: colores.peligro,
    fontWeight: '600',
    fontSize: 14,
  },
  bannerGeofence: {
    backgroundColor: colores.exito,
    borderRadius: 14,
    padding: espaciado.medio,
    marginBottom: espaciado.medio,
    borderWidth: 1,
    borderColor: colores.primario,
  },
  bannerTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colores.primarioOscuro,
  },
  bannerAccion: {
    fontSize: 14,
    color: colores.primario,
    marginTop: 4,
    fontWeight: '600',
  },
  buscando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: espaciado.medio,
  },
  buscandoTexto: {
    color: colores.textoSuave,
    fontSize: 13,
  },
  tituloLista: {
    fontSize: 14,
    fontWeight: '700',
    color: colores.textoSuave,
    marginBottom: espaciado.chico,
    textTransform: 'uppercase',
  },
  tarjetaSucursal: {
    backgroundColor: colores.tarjeta,
    borderRadius: 14,
    padding: espaciado.medio,
    marginBottom: espaciado.chico,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  nombreSucursal: {
    fontSize: 16,
    fontWeight: '700',
    color: colores.texto,
  },
  direccion: {
    fontSize: 13,
    color: colores.textoSuave,
    marginTop: 2,
  },
  error: {
    color: colores.peligro,
    marginBottom: espaciado.chico,
  },
});
