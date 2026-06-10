import { useEffect, useState } from 'react';

interface EstadoSalud {
  estado: string;
  baseDeDatos: string;
  version: string;
}

/**
 * Placeholder del panel B2B (Sprint 0).
 * Sprint 4: subida/sincronización de catálogo, configuración de
 * sucursales, métricas básicas, alta de tenants y logs de transacciones.
 * Dashboards complejos: Metabase en Fase 2 (no construir gráficos a mano).
 */
export function App() {
  const [salud, setSalud] = useState<EstadoSalud | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/salud')
      .then((r) => r.json())
      .then(setSalud)
      .catch(() => setError(true));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>🛒 SmartCart — Panel B2B</h1>
      <p>Esqueleto del Sprint 0. Las funciones del panel llegan en el Sprint 4.</p>
      <section style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>Estado del backend</h2>
        {salud && (
          <p>
            ✅ Backend: <strong>{salud.estado}</strong> · Base de datos: <strong>{salud.baseDeDatos}</strong> · v{salud.version}
          </p>
        )}
        {error && <p>❌ No se pudo contactar al backend (¿está corriendo en el puerto 3000?)</p>}
        {!salud && !error && <p>Consultando…</p>}
      </section>
    </main>
  );
}
