import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EstadoSesion, ResultadoValidacion } from '@smartcart/compartido';
import { api, VistaEgreso } from '../api/cliente';
import { colores, espaciado } from '../tema';
import { formatearCentavos } from '../utilidades/moneda';

interface Props {
  nombreOperador: string;
  alSalir: () => void;
}

/**
 * Vista del operador de egreso: escanea el QR del cliente (o ingresa
 * el código a mano), ve el carrito declarado y registra el resultado
 * del cotejo físico. El backend garantiza que cada QR se valida UNA vez.
 */
export function PantallaOperador({ nombreOperador, alSalir }: Props) {
  const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
  const [egreso, setEgreso] = useState<VistaEgreso | null>(null);
  const [codigoManual, setCodigoManual] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [resultadoFinal, setResultadoFinal] = useState<ResultadoValidacion | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const escaneoBloqueado = useRef(false);

  const consultar = async (codigo: string) => {
    setOcupado(true);
    setMensaje(null);
    try {
      const vista = await api.buscarEgreso(codigo.trim());
      setEgreso(vista);
      if (vista.estado === EstadoSesion.VALIDADA) {
        setMensaje('⚠️ Este QR YA FUE UTILIZADO');
      }
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'Código inexistente');
    } finally {
      setOcupado(false);
    }
  };

  const alLeerQr = ({ data }: { data: string }) => {
    if (escaneoBloqueado.current || egreso) return;
    escaneoBloqueado.current = true;
    setTimeout(() => {
      escaneoBloqueado.current = false;
    }, 2000);
    void consultar(data);
  };

  const registrar = async (resultado: ResultadoValidacion) => {
    if (!egreso?.codigoEgreso) return;
    setOcupado(true);
    try {
      await api.validarEgreso(egreso.codigoEgreso, resultado);
      setResultadoFinal(resultado);
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo registrar');
    } finally {
      setOcupado(false);
    }
  };

  const reiniciar = () => {
    setEgreso(null);
    setResultadoFinal(null);
    setMensaje(null);
    setCodigoManual('');
  };

  // --- Resultado registrado ---
  if (resultadoFinal) {
    const textos: Record<ResultadoValidacion, string> = {
      [ResultadoValidacion.APROBADA]: '✅ Egreso aprobado',
      [ResultadoValidacion.CON_DIFERENCIAS]: '⚠️ Registrado con diferencias',
      [ResultadoValidacion.RECHAZADA]: '⛔ Egreso rechazado',
    };
    return (
      <View style={estilos.centrado}>
        <Text style={estilos.tituloResultado}>{textos[resultadoFinal]}</Text>
        <TouchableOpacity style={estilos.boton} onPress={reiniciar}>
          <Text style={estilos.botonTexto}>Escanear otro QR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Vista del carrito declarado ---
  if (egreso) {
    const yaUsado = egreso.estado === EstadoSesion.VALIDADA;
    return (
      <View style={estilos.contenedor}>
        <View style={estilos.encabezado}>
          <Text style={estilos.titulo}>Carrito declarado</Text>
          <TouchableOpacity onPress={reiniciar}>
            <Text style={estilos.accionSecundaria}>Volver</Text>
          </TouchableOpacity>
        </View>
        <Text style={estilos.subtitulo}>
          {egreso.usuario.nombre} · {egreso.sucursal.nombre}
        </Text>
        {mensaje && <Text style={estilos.alerta}>{mensaje}</Text>}

        <FlatList
          style={estilos.lista}
          data={egreso.eventos}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <View style={estilos.item}>
              <Text style={estilos.itemCantidad}>{item.cantidad}×</Text>
              <Text style={estilos.itemNombre} numberOfLines={1}>
                {item.nombreProducto}
              </Text>
              <Text style={estilos.itemSubtotal}>
                {formatearCentavos(item.snapshotPrecioCentavos * item.cantidad)}
              </Text>
            </View>
          )}
        />

        <View style={estilos.pieTotal}>
          <Text style={estilos.totalEtiqueta}>Total pagado</Text>
          <Text style={estilos.totalMonto}>{formatearCentavos(egreso.totalCentavos)}</Text>
        </View>

        {!yaUsado && (
          <View style={estilos.botonera}>
            <TouchableOpacity
              style={[estilos.botonValidar, { backgroundColor: colores.primario }]}
              onPress={() => registrar(ResultadoValidacion.APROBADA)}
              disabled={ocupado}
            >
              <Text style={estilos.botonTexto}>Aprobar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.botonValidar, { backgroundColor: '#B7791F' }]}
              onPress={() => registrar(ResultadoValidacion.CON_DIFERENCIAS)}
              disabled={ocupado}
            >
              <Text style={estilos.botonTexto}>Con diferencias</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.botonValidar, { backgroundColor: colores.peligro }]}
              onPress={() => registrar(ResultadoValidacion.RECHAZADA)}
              disabled={ocupado}
            >
              <Text style={estilos.botonTexto}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}
        {ocupado && <ActivityIndicator color={colores.primario} />}
      </View>
    );
  }

  // --- Escáner de QR ---
  return (
    <View style={estilos.contenedor}>
      <View style={estilos.encabezado}>
        <View>
          <Text style={estilos.titulo}>Validación de egreso</Text>
          <Text style={estilos.subtitulo}>Operador: {nombreOperador}</Text>
        </View>
        <TouchableOpacity onPress={alSalir}>
          <Text style={estilos.accionPeligro}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={estilos.zonaCamara}>
        {permisoCamara?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={alLeerQr}
          />
        ) : (
          <View style={estilos.sinCamara}>
            <Text style={estilos.sinCamaraTexto}>
              Permití la cámara para escanear el QR del cliente.
            </Text>
            <TouchableOpacity style={estilos.boton} onPress={() => pedirPermisoCamara()}>
              <Text style={estilos.botonTexto}>Permitir cámara</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {mensaje && <Text style={estilos.alerta}>{mensaje}</Text>}

      <Text style={estilos.etiquetaManual}>O ingresá el código a mano</Text>
      <View style={estilos.filaManual}>
        <TextInput
          style={estilos.entradaManual}
          value={codigoManual}
          onChangeText={setCodigoManual}
          placeholder="Código de egreso"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={estilos.boton}
          onPress={() => codigoManual.trim() && consultar(codigoManual)}
          disabled={ocupado}
        >
          {ocupado ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.botonTexto}>Buscar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
    paddingTop: 56,
    paddingHorizontal: espaciado.medio,
  },
  centrado: {
    flex: 1,
    backgroundColor: colores.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.grande,
    gap: espaciado.grande,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colores.texto,
  },
  tituloResultado: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colores.texto,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 13,
    color: colores.textoSuave,
    marginBottom: espaciado.chico,
  },
  accionSecundaria: {
    color: colores.primario,
    fontWeight: '600',
  },
  accionPeligro: {
    color: colores.peligro,
    fontWeight: '600',
  },
  zonaCamara: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    justifyContent: 'center',
    marginTop: espaciado.chico,
  },
  sinCamara: {
    alignItems: 'center',
    padding: espaciado.grande,
    gap: espaciado.medio,
  },
  sinCamaraTexto: {
    color: '#fff',
    textAlign: 'center',
  },
  alerta: {
    color: colores.peligro,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: espaciado.chico,
  },
  etiquetaManual: {
    marginTop: espaciado.medio,
    fontSize: 13,
    color: colores.textoSuave,
    fontWeight: '600',
  },
  filaManual: {
    flexDirection: 'row',
    gap: espaciado.chico,
    marginTop: 6,
  },
  entradaManual: {
    flex: 1,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  lista: {
    flex: 1,
    marginTop: espaciado.chico,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
    gap: espaciado.chico,
  },
  itemCantidad: {
    fontWeight: '700',
    color: colores.primario,
    minWidth: 32,
  },
  itemNombre: {
    flex: 1,
    fontSize: 14,
    color: colores.texto,
  },
  itemSubtotal: {
    fontWeight: '600',
    color: colores.texto,
  },
  pieTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: espaciado.chico,
  },
  totalEtiqueta: {
    fontSize: 15,
    color: colores.textoSuave,
    fontWeight: '600',
  },
  totalMonto: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colores.texto,
  },
  botonera: {
    gap: espaciado.chico,
    paddingBottom: espaciado.grande,
  },
  botonValidar: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  boton: {
    backgroundColor: colores.primario,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: espaciado.grande,
    alignItems: 'center',
  },
  botonTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
