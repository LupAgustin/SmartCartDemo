import { parsearCsvCatalogo } from './parser-csv';

const ENCABEZADO = 'ean,nombre,marca,precio_centavos,activo';

describe('parser del CSV de catálogo', () => {
  it('parsea un archivo válido completo', () => {
    const csv = [
      ENCABEZADO,
      '7790000000010,Yerba Mate 1kg,Playadito,680000,true',
      '7790000000027,Leche Entera 1L,La Serenísima,185000,false',
    ].join('\n');
    const { productos, errores } = parsearCsvCatalogo(csv);
    expect(errores).toEqual([]);
    expect(productos).toEqual([
      { ean: '7790000000010', nombre: 'Yerba Mate 1kg', marca: 'Playadito', precioCentavos: 680000, activo: true },
      { ean: '7790000000027', nombre: 'Leche Entera 1L', marca: 'La Serenísima', precioCentavos: 185000, activo: false },
    ]);
  });

  it('tolera finales de línea Windows (CRLF) y líneas en blanco', () => {
    const csv = `${ENCABEZADO}\r\n7790000000010,Yerba,Playadito,680000,true\r\n\r\n`;
    const { productos, errores } = parsearCsvCatalogo(csv);
    expect(errores).toEqual([]);
    expect(productos).toHaveLength(1);
  });

  it('rechaza el archivo si el encabezado no es el acordado', () => {
    const { productos, errores } = parsearCsvCatalogo('codigo,descripcion,precio\n123,x,1');
    expect(productos).toEqual([]);
    expect(errores[0]).toContain('Encabezado inválido');
  });

  it('rechaza un archivo vacío', () => {
    const { productos, errores } = parsearCsvCatalogo('');
    expect(productos).toEqual([]);
    expect(errores).toEqual(['El archivo CSV está vacío']);
  });

  it('marca marca vacía como undefined (campo opcional)', () => {
    const { productos } = parsearCsvCatalogo(`${ENCABEZADO}\n7790000000010,Yerba,,680000,true`);
    expect(productos[0].marca).toBeUndefined();
  });

  describe('filas inválidas: se reportan con número de línea y NO frenan al resto', () => {
    it.each([
      ['EAN no numérico', 'ABC,Yerba,Marca,680000,true', 'EAN inválido'],
      ['EAN muy corto', '123,Yerba,Marca,680000,true', 'EAN inválido'],
      ['sin nombre', '7790000000010,,Marca,680000,true', 'falta el nombre'],
      ['precio decimal', '7790000000010,Yerba,Marca,6800.50,true', 'precio inválido'],
      ['precio negativo', '7790000000010,Yerba,Marca,-100,true', 'precio inválido'],
      ['activo inválido', '7790000000010,Yerba,Marca,680000,si', 'activo debe ser true/false'],
      ['columnas de menos', '7790000000010,Yerba,680000,true', '5 columnas'],
    ])('%s', (_caso, filaInvalida, mensajeEsperado) => {
      const csv = [ENCABEZADO, filaInvalida, '7790000000027,Leche,Sancor,185000,true'].join('\n');
      const { productos, errores } = parsearCsvCatalogo(csv);
      expect(errores).toHaveLength(1);
      expect(errores[0]).toContain('Línea 2');
      expect(errores[0]).toContain(mensajeEsperado);
      // La fila válida posterior se importa igual.
      expect(productos.map((p) => p.ean)).toEqual(['7790000000027']);
    });
  });

  it('descarta EANs duplicados conservando la primera aparición', () => {
    const csv = [
      ENCABEZADO,
      '7790000000010,Yerba original,Playadito,680000,true',
      '7790000000010,Yerba duplicada,Otra,999999,true',
    ].join('\n');
    const { productos, errores } = parsearCsvCatalogo(csv);
    expect(productos).toHaveLength(1);
    expect(productos[0].nombre).toBe('Yerba original');
    expect(errores[0]).toContain('duplicado');
  });
});
