import { calcularTotalCentavos } from './calculo-total';

describe('cálculo del total de la sesión (regla de snapshot de precio)', () => {
  it('un carrito vacío suma 0', () => {
    expect(calcularTotalCentavos([])).toBe(0);
  });

  it('suma snapshot × cantidad de cada ítem', () => {
    const total = calcularTotalCentavos([
      { snapshotPrecioCentavos: 185000, cantidad: 2 },
      { snapshotPrecioCentavos: 680000, cantidad: 1 },
    ]);
    expect(total).toBe(185000 * 2 + 680000);
  });

  it('usa SIEMPRE el snapshot, no el precio actual del catálogo', () => {
    // El mismo producto escaneado antes y después de un cambio de precio
    // queda como dos eventos con snapshots distintos: ambos se respetan.
    const total = calcularTotalCentavos([
      { snapshotPrecioCentavos: 100000, cantidad: 1 }, // escaneado a $1000
      { snapshotPrecioCentavos: 120000, cantidad: 1 }, // re-escaneado a $1200
    ]);
    expect(total).toBe(220000);
  });

  it('mantiene exactitud entera en montos grandes (sin punto flotante)', () => {
    const total = calcularTotalCentavos([
      { snapshotPrecioCentavos: 99999999, cantidad: 99 },
    ]);
    expect(total).toBe(99999999 * 99);
    expect(Number.isInteger(total)).toBe(true);
  });
});
