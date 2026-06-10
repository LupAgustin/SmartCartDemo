import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Placeholder de la app móvil SmartCart (Sprint 0).
 * Sprint 2: login, selección/geofence de sucursal, escaneo EAN-13/UPC,
 * carrito virtual con total en tiempo real y persistencia local.
 * El pago (Sprint 3) exige conexión; el carrito sincroniza al recuperar señal.
 */
export default function App() {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>🛒 SmartCart</Text>
      <Text style={estilos.subtitulo}>Escaneá, comprá y salí sin filas.</Text>
      <Text style={estilos.nota}>Esqueleto del Sprint 0 — el flujo de compra llega en el Sprint 2.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitulo: {
    fontSize: 18,
    marginTop: 8,
    color: '#444',
  },
  nota: {
    fontSize: 13,
    marginTop: 24,
    color: '#888',
    textAlign: 'center',
  },
});
