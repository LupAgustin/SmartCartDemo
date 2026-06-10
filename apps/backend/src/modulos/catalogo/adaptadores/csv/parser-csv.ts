import { ProductoFuente } from '../adaptador-fuente-catalogo';

/**
 * Parser del formato CSV de catálogo del MVP.
 * Formato acordado (encabezado obligatorio):
 *   ean,nombre,marca,precio_centavos,activo
 *
 * Limitación conocida y documentada: no soporta comas dentro de los
 * campos (el formato del MVP no las usa). Si un súper las necesita,
 * se reemplaza por csv-parse sin tocar a los consumidores.
 */
export interface ResultadoParseo {
  productos: ProductoFuente[];
  errores: string[];
}

const ENCABEZADO_ESPERADO = 'ean,nombre,marca,precio_centavos,activo';
const PATRON_EAN = /^\d{8,14}$/; // EAN-8 a EAN-14 / UPC

export function parsearCsvCatalogo(contenido: string): ResultadoParseo {
  const lineas = contenido
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length === 0) {
    return { productos: [], errores: ['El archivo CSV está vacío'] };
  }

  const [encabezado, ...filas] = lineas;
  if (encabezado.toLowerCase() !== ENCABEZADO_ESPERADO) {
    return {
      productos: [],
      errores: [`Encabezado inválido: se esperaba "${ENCABEZADO_ESPERADO}" y llegó "${encabezado}"`],
    };
  }

  const productos: ProductoFuente[] = [];
  const errores: string[] = [];
  const eansVistos = new Set<string>();

  filas.forEach((fila, indice) => {
    const numeroLinea = indice + 2; // +2: índice base 0 y línea de encabezado
    const columnas = fila.split(',');
    if (columnas.length !== 5) {
      errores.push(`Línea ${numeroLinea}: se esperaban 5 columnas y hay ${columnas.length}`);
      return;
    }
    const [ean, nombre, marca, precioCrudo, activoCrudo] = columnas.map((c) => c.trim());

    if (!PATRON_EAN.test(ean)) {
      errores.push(`Línea ${numeroLinea}: EAN inválido "${ean}"`);
      return;
    }
    if (eansVistos.has(ean)) {
      errores.push(`Línea ${numeroLinea}: EAN duplicado "${ean}" (se conserva la primera aparición)`);
      return;
    }
    if (!nombre) {
      errores.push(`Línea ${numeroLinea}: falta el nombre del producto`);
      return;
    }
    const precioCentavos = Number(precioCrudo);
    if (!Number.isInteger(precioCentavos) || precioCentavos <= 0) {
      errores.push(`Línea ${numeroLinea}: precio inválido "${precioCrudo}" (centavos enteros > 0)`);
      return;
    }
    if (activoCrudo !== 'true' && activoCrudo !== 'false') {
      errores.push(`Línea ${numeroLinea}: columna activo debe ser true/false y es "${activoCrudo}"`);
      return;
    }

    eansVistos.add(ean);
    productos.push({
      ean,
      nombre,
      marca: marca || undefined,
      precioCentavos,
      activo: activoCrudo === 'true',
    });
  });

  return { productos, errores };
}
