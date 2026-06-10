import { EstadoSesion, RolUsuario } from '@prisma/client';
import { PrismaServicio } from '../../prisma/prisma.servicio';
import { UsuarioAutenticado } from '../auth/auth.tipos';
import { CatalogoServicio } from '../catalogo/catalogo.servicio';
import { SesionCompraServicio } from './sesion-compra.servicio';

/**
 * Tests de la REGLA DE NEGOCIO CENTRAL: el precio queda congelado
 * (snapshot) al momento del escaneo, aunque el catálogo cambie después.
 */

const usuario: UsuarioAutenticado = {
  id: 'usuario-1',
  tenantId: 'tenant-a',
  email: 'cliente@demo.com.ar',
  rol: RolUsuario.CLIENTE,
};

const sesionActiva = {
  id: 'sesion-1',
  tenantId: 'tenant-a',
  usuarioId: 'usuario-1',
  sucursalId: 'sucursal-1',
  estado: EstadoSesion.ACTIVA,
};

const producto = {
  id: 'producto-1',
  ean: '7790000000010',
  nombre: 'Yerba Mate 1kg',
  precioActualCentavos: 680000,
};

describe('SesionCompraServicio: snapshot de precio en el escaneo', () => {
  let prisma: any;
  let catalogo: { buscarPorEan: jest.Mock };
  let servicio: SesionCompraServicio;

  beforeEach(() => {
    prisma = {
      sesionDeCompra: { findFirst: jest.fn().mockResolvedValue(sesionActiva) },
      eventoDeEscaneo: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    catalogo = { buscarPorEan: jest.fn().mockResolvedValue(producto) };
    servicio = new SesionCompraServicio(
      prisma as unknown as PrismaServicio,
      catalogo as unknown as CatalogoServicio,
    );
    // obtener() rearma la sesión completa desde la base; acá no es lo que se prueba.
    jest.spyOn(servicio, 'obtener').mockResolvedValue({ id: 'sesion-1' } as any);
  });

  it('el primer escaneo crea el evento con el precio ACTUAL como snapshot', async () => {
    prisma.eventoDeEscaneo.findFirst.mockResolvedValue(null);

    await servicio.registrarEscaneo(usuario, 'sesion-1', producto.ean);

    expect(prisma.eventoDeEscaneo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        sesionId: 'sesion-1',
        ean: producto.ean,
        nombreProducto: producto.nombre,
        snapshotPrecioCentavos: 680000,
        cantidad: 1,
      }),
    });
  });

  it('re-escanear el mismo producto al MISMO precio acumula cantidad (no toca el snapshot)', async () => {
    prisma.eventoDeEscaneo.findFirst.mockResolvedValue({ id: 'evento-1' });

    await servicio.registrarEscaneo(usuario, 'sesion-1', producto.ean, 2);

    // Busca un evento existente exigiendo el MISMO snapshot.
    expect(prisma.eventoDeEscaneo.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: 'tenant-a',
        ean: producto.ean,
        snapshotPrecioCentavos: 680000,
      }),
    });
    expect(prisma.eventoDeEscaneo.update).toHaveBeenCalledWith({
      where: { id: 'evento-1' },
      data: { cantidad: { increment: 2 } },
    });
    expect(prisma.eventoDeEscaneo.create).not.toHaveBeenCalled();
  });

  it('si el precio cambió entre escaneos se crea OTRO evento: el snapshot viejo es inmutable', async () => {
    // El catálogo ahora devuelve el producto con precio nuevo; no hay
    // evento previo con ESE snapshot, así que nace un evento aparte.
    catalogo.buscarPorEan.mockResolvedValue({ ...producto, precioActualCentavos: 720000 });
    prisma.eventoDeEscaneo.findFirst.mockResolvedValue(null);

    await servicio.registrarEscaneo(usuario, 'sesion-1', producto.ean);

    expect(prisma.eventoDeEscaneo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ snapshotPrecioCentavos: 720000 }),
    });
    expect(prisma.eventoDeEscaneo.update).not.toHaveBeenCalled();
  });

  it('no permite escanear sobre una sesión que no está ACTIVA', async () => {
    prisma.sesionDeCompra.findFirst.mockResolvedValue({
      ...sesionActiva,
      estado: EstadoSesion.PAGADA,
    });

    await expect(
      servicio.registrarEscaneo(usuario, 'sesion-1', producto.ean),
    ).rejects.toThrow('PAGADA');
    expect(catalogo.buscarPorEan).not.toHaveBeenCalled();
  });

  it('si el producto es desconocido, el error del catálogo se propaga sin crear eventos', async () => {
    const errorDesconocido = new Error('PRODUCTO_DESCONOCIDO');
    catalogo.buscarPorEan.mockRejectedValue(errorDesconocido);

    await expect(
      servicio.registrarEscaneo(usuario, 'sesion-1', '7790000000999'),
    ).rejects.toThrow(errorDesconocido);
    expect(prisma.eventoDeEscaneo.create).not.toHaveBeenCalled();
  });
});
