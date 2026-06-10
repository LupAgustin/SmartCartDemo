import { ProductoFuente } from './adaptadores/adaptador-fuente-catalogo';
import { ProductoCacheado, reconciliarCatalogo } from './reconciliacion';

const cacheado = (extra: Partial<ProductoCacheado> = {}): ProductoCacheado => ({
  ean: '7790000000010',
  nombre: 'Yerba Mate Tradicional 1kg',
  marca: 'Playadito',
  precioActualCentavos: 680000,
  activo: true,
  ...extra,
});

const fuente = (extra: Partial<ProductoFuente> = {}): ProductoFuente => ({
  ean: '7790000000010',
  nombre: 'Yerba Mate Tradicional 1kg',
  marca: 'Playadito',
  precioCentavos: 680000,
  activo: true,
  ...extra,
});

describe('reconciliación del catálogo cacheado contra la fuente', () => {
  it('un producto idéntico no genera cambios', () => {
    const plan = reconciliarCatalogo([cacheado()], [fuente()]);
    expect(plan).toEqual({ altas: [], bajas: [], cambios: [], sinCambios: 1 });
  });

  it('un EAN nuevo en la fuente es un alta', () => {
    const nuevo = fuente({ ean: '7790000000027', nombre: 'Yerba Suave 500g' });
    const plan = reconciliarCatalogo([cacheado()], [fuente(), nuevo]);
    expect(plan.altas).toEqual([nuevo]);
    expect(plan.sinCambios).toBe(1);
  });

  it('un EAN activo ausente en la fuente es baja LÓGICA (nunca borrado)', () => {
    const plan = reconciliarCatalogo([cacheado()], []);
    expect(plan.bajas).toEqual(['7790000000010']);
    expect(plan.altas).toEqual([]);
  });

  it('un producto ya dado de baja y ausente en la fuente no se vuelve a bajar', () => {
    const plan = reconciliarCatalogo([cacheado({ activo: false })], []);
    expect(plan.bajas).toEqual([]);
  });

  it('un cambio de precio genera una actualización', () => {
    const conNuevoPrecio = fuente({ precioCentavos: 720000 });
    const plan = reconciliarCatalogo([cacheado()], [conNuevoPrecio]);
    expect(plan.cambios).toEqual([conNuevoPrecio]);
    expect(plan.sinCambios).toBe(0);
  });

  it('un cambio de nombre o marca también genera actualización', () => {
    const renombrado = fuente({ nombre: 'Yerba Tradicional 1kg' });
    expect(reconciliarCatalogo([cacheado()], [renombrado]).cambios).toEqual([renombrado]);

    const sinMarca = fuente({ marca: undefined });
    expect(reconciliarCatalogo([cacheado()], [sinMarca]).cambios).toEqual([sinMarca]);
  });

  it('un producto dado de baja que reaparece activo en la fuente se reactiva', () => {
    const plan = reconciliarCatalogo([cacheado({ activo: false })], [fuente()]);
    expect(plan.cambios).toHaveLength(1);
    expect(plan.cambios[0].activo).toBe(true);
  });

  it('catálogo grande: combina altas, bajas, cambios y sin cambios en una corrida', () => {
    const cache = [
      cacheado(), // sin cambios
      cacheado({ ean: '7790000000027', nombre: 'Leche 1L', precioActualCentavos: 185000 }), // cambia precio
      cacheado({ ean: '7790000000034', nombre: 'Pan lactal' }), // baja
    ];
    const enFuente = [
      fuente(),
      fuente({ ean: '7790000000027', nombre: 'Leche 1L', precioCentavos: 195000 }),
      fuente({ ean: '7790000000041', nombre: 'Galletitas' }), // alta
    ];
    const plan = reconciliarCatalogo(cache, enFuente);
    expect(plan.altas.map((p) => p.ean)).toEqual(['7790000000041']);
    expect(plan.cambios.map((p) => p.ean)).toEqual(['7790000000027']);
    expect(plan.bajas).toEqual(['7790000000034']);
    expect(plan.sinCambios).toBe(1);
  });
});
