/**
 * Formateo de montos en centavos de ARS a texto.
 * Manual a propósito: evita depender del soporte de Intl del motor JS
 * del dispositivo y garantiza el formato argentino (1.234,56).
 */
export function formatearCentavos(centavos: number): string {
  const negativo = centavos < 0;
  const absoluto = Math.abs(centavos);
  const pesos = Math.floor(absoluto / 100);
  const decimales = String(absoluto % 100).padStart(2, '0');
  const miles = pesos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}$ ${miles},${decimales}`;
}
