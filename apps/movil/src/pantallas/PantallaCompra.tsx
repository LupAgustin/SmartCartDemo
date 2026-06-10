import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EventoDeEscaneoDTO, ProductoCatalogoDTO } from '@smartcart/compartido';
import { api, ErrorApi, SesionConCarrito } from '../api/cliente';
import { colores, espaciado } from '../tema';
import { formatearCentavos } from '../utilidades/moneda';

interface Props {
  sesionInicial: SesionConCarrito;
  alTerminar: () => void;
}

/** Pausa entre lecturas del escáner para no registrar el mismo código en ráfaga. */
const PAUSA_ESCANEO_MS = 1800;

/**
 * El corazón de la app: cámara escaneando EAN arriba, carrito con
 * total en tiempo real abajo. El precio de cada ítem es el SNAPSHOT
 * del momento del escaneo (lo garantiza el backend).
 */
export function PantallaCompra({ sesionInicial, alTerminar }: Props) {
  const [sesion, setSesion] = useState<SesionConCarrito>(sesionInicial);
  const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [resultados, setResultados] = useState<ProductoCatalogoDTO[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const escaneoBloqueado = useRef(false);

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 2500);
  };

  const escanear = async (ean: string) => {
    setOcupado(true);
    try {
      const actualizada = await api.escanear(sesion.id, ean);
      setSesion(actualizada);
    } catch (e) {
      if (e instanceof ErrorApi && e.cuerpo?.codigo === 'PRODUCTO_DESCONOCIDO') {
        // Regla de negocio: un EAN fuera de catálogo no rompe el flujo.
        // La alerta interna ya quedó registrada; acá ofrecemos buscar a mano.
        mostrarAviso('Producto no encontrado: buscalo por nombre');
        setBuscando(true);
      } else {
        mostrarAviso(e instanceof Error ? e.message : 'Error al escanear');
      }
    } finally {
      setOcupado(false);
    }
  };

  const alLeerCodigo = ({ data }: { data: string }) => {
    if (escaneoBloqueado.current || ocupado) return;
    escaneoBloqueado.current = true;
    setTimeout(() => {
      escaneoBloqueado.current = false;
    }, PAUSA_ESCANEO_MS);
    void escanear(data);
  };

  const buscarPorNombre = async (texto: string) => {
    setTextoBusqueda(texto);
    if (texto.trim().length < 2) {
      setResultados([]);
      return;
    }
    try {
      setResultados(await api.buscarProductos(texto));
    } catch {
      setResultados([]);
    }
  };

  const agregarDesdeBusqueda = async (producto: ProductoCatalogoDTO) => {
    setBuscando(false);
    setTextoBusqueda('');
    setResultados([]);
    await escanear(producto.ean);
  };

  const cambiarCantidad = async (evento: EventoDeEscaneoDTO, delta: number) => {
    setOcupado(true);
    try {
      const actualizada = await api.actualizarCantidad(
        sesion.id,
        evento.id,
        evento.cantidad + delta,
      );
      setSesion(actualizada);
    } catch (e) {
      mostrarAviso(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setOcupado(false);
    }
  };

  const confirmarSalida = () => {
    Alert.alert('Cancelar compra', '¿Vaciar el carrito y salir de la sucursal?', [
      { text: 'Seguir comprando', style: 'cancel' },
      {
        text: 'Cancelar compra',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.cancelarSesion(sesion.id);
          } finally {
            alTerminar();
          }
        },
      },
    ]);
  };

  return (
    <View style={estilos.contenedor}>
      {/* Encabezado */}
      <View style={estilos.encabezado}>
        <View>
          <Text style={estilos.nombreSucursal}>{sesion.sucursal.nombre}</Text>
          <Text style={estilos.subtitulo}>Escaneá el código de barras</Text>
        </View>
        <TouchableOpacity onPress={confirmarSalida}>
          <Text style={estilos.cancelar}>Cancelar</Text>
        </TouchableOpacity>
      </View>

      {/* Escáner */}
      <View style={estilos.zonaCamara}>
        {permisoCamara?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
            }}
            onBarcodeScanned={alLeerCodigo}
          />
        ) : (
          <View style={estilos.sinCamara}>
            <Text style={estilos.sinCamaraTexto}>
              SmartCart necesita la cámara para escanear productos.
            </Text>
            <TouchableOpacity style={estilos.botonChico} onPress={() => pedirPermisoCamara()}>
              <Text style={estilos.botonChicoTexto}>Permitir cámara</Text>
            </TouchableOpacity>
          </View>
        )}
        {aviso && (
          <View style={estilos.aviso}>
            <Text style={estilos.avisoTexto}>{aviso}</Text>
          </View>
        )}
      </View>

      {/* Acceso a búsqueda manual (siempre disponible) */}
      <TouchableOpacity style={estilos.busquedaManual} onPress={() => setBuscando(true)}>
        <Text style={estilos.busquedaManualTexto}>🔎 ¿No escanea? Buscá por nombre</Text>
      </TouchableOpacity>

      {/* Carrito */}
      <View style={estilos.carrito}>
        <Text style={estilos.tituloCarrito}>
          Tu carrito {sesion.eventos.length > 0 ? `(${sesion.eventos.length})` : ''}
        </Text>
        {sesion.eventos.length === 0 ? (
          <Text style={estilos.carritoVacio}>Todavía no escaneaste nada.</Text>
        ) : (
          <FlatList
            data={sesion.eventos}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => (
              <View style={estilos.item}>
                <View style={estilos.itemInfo}>
                  <Text style={estilos.itemNombre} numberOfLines={1}>
                    {item.nombreProducto}
                  </Text>
                  <Text style={estilos.itemPrecio}>
                    {formatearCentavos(item.snapshotPrecioCentavos)} c/u
                  </Text>
                </View>
                <View style={estilos.controles}>
                  <TouchableOpacity
                    style={estilos.botonCantidad}
                    onPress={() => cambiarCantidad(item, -1)}
                    disabled={ocupado}
                  >
                    <Text style={estilos.botonCantidadTexto}>−</Text>
                  </TouchableOpacity>
                  <Text style={estilos.cantidad}>{item.cantidad}</Text>
                  <TouchableOpacity
                    style={estilos.botonCantidad}
                    onPress={() => cambiarCantidad(item, +1)}
                    disabled={ocupado}
                  >
                    <Text style={estilos.botonCantidadTexto}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={estilos.subtotal}>
                  {formatearCentavos(item.snapshotPrecioCentavos * item.cantidad)}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Total */}
      <View style={estilos.pieTotal}>
        <Text style={estilos.totalEtiqueta}>Total</Text>
        <Text style={estilos.totalMonto}>{formatearCentavos(sesion.totalCentavos)}</Text>
      </View>
      <TouchableOpacity style={estilos.botonPagar} disabled>
        <Text style={estilos.botonPagarTexto}>Pagar (llega en el Sprint 3)</Text>
      </TouchableOpacity>

      {/* Modal de búsqueda manual */}
      <Modal visible={buscando} animationType="slide" transparent>
        <View style={estilos.modalFondo}>
          <View style={estilos.modal}>
            <Text style={estilos.modalTitulo}>Buscar producto</Text>
            <TextInput
              style={estilos.entradaBusqueda}
              value={textoBusqueda}
              onChangeText={buscarPorNombre}
              placeholder="Ej: yerba, leche…"
              autoFocus
            />
            <FlatList
              data={resultados}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 280 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                textoBusqueda.trim().length >= 2 ? (
                  <Text style={estilos.carritoVacio}>Sin resultados.</Text>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={estilos.resultado}
                  onPress={() => agregarDesdeBusqueda(item)}
                >
                  <Text style={estilos.itemNombre}>{item.nombre}</Text>
                  <Text style={estilos.itemPrecio}>
                    {item.marca ? `${item.marca} · ` : ''}
                    {formatearCentavos(item.precioActualCentavos)}
                  </Text>
                </TouchableOpacity>
              )}
            />
            {ocupado && <ActivityIndicator color={colores.primario} />}
            <TouchableOpacity
              style={estilos.botonChico}
              onPress={() => {
                setBuscando(false);
                setTextoBusqueda('');
                setResultados([]);
              }}
            >
              <Text style={estilos.botonChicoTexto}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
    paddingTop: 56,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espaciado.medio,
    marginBottom: espaciado.chico,
  },
  nombreSucursal: {
    fontSize: 17,
    fontWeight: '700',
    color: colores.texto,
  },
  subtitulo: {
    fontSize: 13,
    color: colores.textoSuave,
  },
  cancelar: {
    color: colores.peligro,
    fontWeight: '600',
  },
  zonaCamara: {
    height: 220,
    marginHorizontal: espaciado.medio,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  sinCamara: {
    alignItems: 'center',
    padding: espaciado.grande,
    gap: espaciado.medio,
  },
  sinCamaraTexto: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
  aviso: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 10,
    padding: 10,
  },
  avisoTexto: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  busquedaManual: {
    alignItems: 'center',
    paddingVertical: espaciado.chico,
  },
  busquedaManualTexto: {
    color: colores.primario,
    fontWeight: '600',
    fontSize: 14,
  },
  carrito: {
    flex: 1,
    backgroundColor: colores.tarjeta,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: espaciado.medio,
  },
  tituloCarrito: {
    fontSize: 15,
    fontWeight: '700',
    color: colores.texto,
    marginBottom: espaciado.chico,
  },
  carritoVacio: {
    color: colores.textoSuave,
    fontSize: 14,
    textAlign: 'center',
    marginTop: espaciado.medio,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
    gap: espaciado.chico,
  },
  itemInfo: {
    flex: 1,
  },
  itemNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: colores.texto,
  },
  itemPrecio: {
    fontSize: 12,
    color: colores.textoSuave,
  },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botonCantidad: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colores.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colores.borde,
  },
  botonCantidadTexto: {
    fontSize: 18,
    color: colores.texto,
    lineHeight: 20,
  },
  cantidad: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  subtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colores.texto,
    minWidth: 84,
    textAlign: 'right',
  },
  pieTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    paddingHorizontal: espaciado.medio,
    paddingTop: espaciado.chico,
  },
  totalEtiqueta: {
    fontSize: 16,
    color: colores.textoSuave,
    fontWeight: '600',
  },
  totalMonto: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colores.texto,
  },
  botonPagar: {
    backgroundColor: colores.borde,
    margin: espaciado.medio,
    marginTop: espaciado.chico,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonPagarTexto: {
    color: colores.textoSuave,
    fontWeight: '700',
    fontSize: 15,
  },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colores.tarjeta,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: espaciado.grande,
    gap: espaciado.chico,
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: colores.texto,
  },
  entradaBusqueda: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  resultado: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  botonChico: {
    backgroundColor: colores.primario,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: espaciado.medio,
    alignItems: 'center',
  },
  botonChicoTexto: {
    color: '#fff',
    fontWeight: '700',
  },
});
