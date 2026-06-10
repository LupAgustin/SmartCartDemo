import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, ErrorApi, RespuestaAuth } from '../api/cliente';
import { colores, espaciado } from '../tema';

interface Props {
  alIngresar: (respuesta: RespuestaAuth) => void;
}

/**
 * Login y registro del cliente final. El supermercado (tenant) viene
 * prefijado con el del seed para que la demo no pida configuración.
 */
export function PantallaAcceso({ alIngresar }: Props) {
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [tenantSlug, setTenantSlug] = useState('super-demo');
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    setError(null);
    setCargando(true);
    try {
      const respuesta =
        modo === 'login'
          ? await api.ingresar({ tenantSlug, email: email.trim(), contrasena })
          : await api.registrar({ tenantSlug, email: email.trim(), nombre, contrasena });
      alIngresar(respuesta);
    } catch (e) {
      if (e instanceof ErrorApi && e.cuerpo && 'detalles' in e.cuerpo) {
        setError((e.cuerpo as { detalles: string[] }).detalles.join('\n'));
      } else {
        setError(e instanceof Error ? e.message : 'Error inesperado');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={estilos.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={estilos.titulo}>🛒 SmartCart</Text>
      <Text style={estilos.subtitulo}>Escaneá, comprá y salí sin filas.</Text>

      <View style={estilos.tarjeta}>
        <Text style={estilos.etiqueta}>Supermercado</Text>
        <TextInput
          style={estilos.entrada}
          value={tenantSlug}
          onChangeText={setTenantSlug}
          autoCapitalize="none"
          placeholder="super-demo"
        />

        {modo === 'registro' && (
          <>
            <Text style={estilos.etiqueta}>Nombre</Text>
            <TextInput
              style={estilos.entrada}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre"
            />
          </>
        )}

        <Text style={estilos.etiqueta}>Email</Text>
        <TextInput
          style={estilos.entrada}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="cliente@demo.com.ar"
        />

        <Text style={estilos.etiqueta}>Contraseña</Text>
        <TextInput
          style={estilos.entrada}
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
          placeholder="••••••••"
        />

        {error && <Text style={estilos.error}>{error}</Text>}

        <TouchableOpacity style={estilos.boton} onPress={enviar} disabled={cargando}>
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.botonTexto}>
              {modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setModo(modo === 'login' ? 'registro' : 'login');
            setError(null);
          }}
        >
          <Text style={estilos.alternar}>
            {modo === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Ingresá'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
    justifyContent: 'center',
    padding: espaciado.grande,
  },
  titulo: {
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colores.texto,
  },
  subtitulo: {
    fontSize: 15,
    textAlign: 'center',
    color: colores.textoSuave,
    marginBottom: espaciado.grande,
  },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: 16,
    padding: espaciado.grande,
    gap: espaciado.chico,
  },
  etiqueta: {
    fontSize: 13,
    color: colores.textoSuave,
    fontWeight: '600',
  },
  entrada: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  boton: {
    backgroundColor: colores.primario,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: espaciado.chico,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  alternar: {
    textAlign: 'center',
    color: colores.primario,
    marginTop: espaciado.chico,
    fontWeight: '600',
  },
  error: {
    color: colores.peligro,
    fontSize: 13,
  },
});
