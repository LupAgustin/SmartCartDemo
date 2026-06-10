import { SucursalDTO } from '@smartcart/compartido';

/** Radio terrestre medio en metros (esfera WGS-84 aproximada). */
const RADIO_TIERRA_METROS = 6371000;

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/** Distancia haversine entre dos coordenadas, en metros. */
export function distanciaMetros(a: Coordenadas, b: Coordenadas): number {
  const aRadianes = (grados: number) => (grados * Math.PI) / 180;
  const dLat = aRadianes(b.latitud - a.latitud);
  const dLon = aRadianes(b.longitud - a.longitud);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.latitud)) * Math.cos(aRadianes(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.sqrt(h));
}

/**
 * Devuelve la sucursal cuyo geofence contiene la posición (la más
 * cercana si hubiera solapamiento), o undefined si no hay ninguna.
 */
export function sucursalEnRango(
  posicion: Coordenadas,
  sucursales: SucursalDTO[],
): SucursalDTO | undefined {
  let mejor: { sucursal: SucursalDTO; distancia: number } | undefined;
  for (const sucursal of sucursales) {
    const distancia = distanciaMetros(posicion, {
      latitud: sucursal.latitud,
      longitud: sucursal.longitud,
    });
    if (distancia <= sucursal.radioGeofenceMetros && (!mejor || distancia < mejor.distancia)) {
      mejor = { sucursal, distancia };
    }
  }
  return mejor?.sucursal;
}
