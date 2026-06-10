/**
 * Cálculo PURO del total de una sesión de compra.
 * REGLA DE NEGOCIO CENTRAL: el total se calcula SIEMPRE sobre el
 * snapshot de precio tomado al momento de cada escaneo, nunca sobre
 * el precio actual del catálogo.
 */

export interface ItemEscaneado {
  snapshotPrecioCentavos: number;
  cantidad: number;
}

export function calcularTotalCentavos(eventos: ItemEscaneado[]): number {
  return eventos.reduce(
    (total, evento) => total + evento.snapshotPrecioCentavos * evento.cantidad,
    0,
  );
}
