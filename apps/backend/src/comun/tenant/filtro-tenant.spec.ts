import { conTenant, crearConTenant, ErrorTenantRequerido } from './filtro-tenant';

describe('aislamiento multi-tenant: conTenant', () => {
  it('agrega tenantId a un where vacío', () => {
    expect(conTenant('tenant-a')).toEqual({ tenantId: 'tenant-a' });
  });

  it('mezcla tenantId con condiciones existentes sin perderlas', () => {
    const where = conTenant('tenant-a', { ean: '7791234567890', activo: true });
    expect(where).toEqual({ ean: '7791234567890', activo: true, tenantId: 'tenant-a' });
  });

  it('lanza error si el tenant viene vacío', () => {
    expect(() => conTenant('')).toThrow(ErrorTenantRequerido);
  });

  it('lanza error si el tenant es solo espacios', () => {
    expect(() => conTenant('   ')).toThrow(ErrorTenantRequerido);
  });

  it('lanza error si el tenant no es un string', () => {
    // Simula un bug de tipado en runtime (ej: undefined desde el JWT).
    expect(() => conTenant(undefined as unknown as string)).toThrow(ErrorTenantRequerido);
  });

  it('pisa un tenantId ajeno inyectado en el where (anti-spoofing)', () => {
    // Un cliente malicioso intenta colar el tenant de otro súper en el filtro:
    // el tenant autenticado siempre gana.
    const where = conTenant('tenant-a', { tenantId: 'tenant-b', ean: 'x' });
    expect(where.tenantId).toBe('tenant-a');
  });

  it('no muta el objeto where original', () => {
    const original = { ean: 'x' };
    conTenant('tenant-a', original);
    expect(original).toEqual({ ean: 'x' });
  });
});

describe('aislamiento multi-tenant: crearConTenant', () => {
  it('asocia los datos nuevos al tenant autenticado', () => {
    const datos = crearConTenant('tenant-a', { nombre: 'Yerba 1kg', ean: '779...' });
    expect(datos.tenantId).toBe('tenant-a');
  });

  it('lanza error si falta el tenant', () => {
    expect(() => crearConTenant('', { nombre: 'x' })).toThrow(ErrorTenantRequerido);
  });
});
