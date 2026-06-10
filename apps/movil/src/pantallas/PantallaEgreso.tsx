import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { EstadoSesion } from '@smartcart/compartido';
import { api } from '../api/cliente';
import { colores, espaciado } from '../tema';
import { formatearCentavos } from '../utilidades/moneda';

interface Props {
  sesionId: string;
  codigoEgreso: string;
  totalCentavos: number;
  alTerminar: () => void;
}

/** Cada cuánto consultamos si el operador ya validó el egreso. */
const INTERVALO_POLLING_MS = 3000;

/**
 * Pantalla post-pago: el QR de egreso que el cliente le muestra al
 * operador en la salida. Es de un solo uso; cuando el operador lo
 * valida, esta pantalla pasa sola a "compra validada".
 */
export function PantallaEgreso({ sesionId, codigoEgreso, totalCentavos, alTerminar }: Props) {
  const [validada, setValidada] = useState(false);

  useEffect(() => {
    if (validada) return;
    const intervalo = setInterval(async () => {
      try {
        const sesion = await api.obtenerSesion(sesionId);
        if (sesion.estado === EstadoSesion.VALIDADA) {
          setValidada(true);
        }
      } catch {
        // Sin red o backend caído: se reintenta en el próximo tick.
      }
    }, INTERVALO_POLLING_MS);
    return () => clearInterval(intervalo);
  }, [sesionId, validada]);

  if (validada) {
    return (
      <View style={estilos.contenedor}>
        <Text style={estilos.emoji}>✅</Text>
        <Text style={estilos.titulo}>¡Compra validada!</Text>
        <Text style={estilos.subtitulo}>
          Ya podés retirarte. Gracias por usar SmartCart.
        </Text>
        <TouchableOpacity style={estilos.boton} onPress={alTerminar}>
          <Text style={estilos.botonTexto}>Nueva compra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Pago aprobado 🎉</Text>
      <Text style={estilos.subtitulo}>
        Mostrale este QR al operador en la salida.
      </Text>

      <View style={estilos.tarjetaQr}>
        <QRCode value={codigoEgreso} size={220} />
      </View>

      <Text style={estilos.totalEtiqueta}>Total pagado</Text>
      <Text style={estilos.totalMonto}>{formatearCentavos(totalCentavos)}</Text>
      <Text style={estilos.nota}>
        El QR es de un solo uso. Esta pantalla se actualiza sola cuando
        el operador valide tu carro.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.grande,
  },
  emoji: {
    fontSize: 56,
    marginBottom: espaciado.chico,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colores.texto,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 15,
    color: colores.textoSuave,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: espaciado.grande,
  },
  tarjetaQr: {
    backgroundColor: '#fff',
    padding: espaciado.grande,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colores.borde,
    marginBottom: espaciado.grande,
  },
  totalEtiqueta: {
    fontSize: 13,
    color: colores.textoSuave,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  totalMonto: {
    fontSize: 30,
    fontWeight: 'bold',
    color: colores.texto,
    marginBottom: espaciado.medio,
  },
  nota: {
    fontSize: 12,
    color: colores.textoSuave,
    textAlign: 'center',
    maxWidth: 280,
  },
  boton: {
    backgroundColor: colores.primario,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: espaciado.grande,
  },
  botonTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
