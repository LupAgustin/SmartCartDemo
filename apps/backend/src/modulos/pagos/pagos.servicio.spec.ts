import { BadRequestException, ConflictException } from '@nestjs/common';
import { EstadoPago, EstadoSesion, RolUsuario } from '@prisma/client';
import { PrismaServicio } from '../../prisma/prisma.servicio';
import { UsuarioAutenticado } from '../auth/auth.tipos';
import { PagosServicio } from './pagos.servicio';
import { ProveedorDePagoSimulado } from './proveedor-simulado';

const usuario: UsuarioAutenticado = {
  id: 'usuario-1',
  tenantId: 'tenant-a',
  email: 'cliente@demo.com.ar',
  rol: RolUsuario.CLIENTE,
};

/** Sesión ACTIVA con dos ítems: total = 2×100000 + 1×50000 = 250000. */
const sesionConItems = {
  id: 'sesion-1',
  tenantId: 'tenant-a',
  usuarioId: 'usuario-1',
  estado: EstadoSesion.ACTIVA,
  eventos: [
    { snapshotPrecioCentavos: 100000, cantidad: 2 },
    { snapshotPrecioCentavos: 50000, cantidad: 1 },
  ],
};

describe('PagosServicio: pago de la sesión con proveedor simulado', () => {
  let prisma: any;
  let servicio: PagosServicio;

  beforeEach(() => {
    prisma = {
      sesionDeCompra: {
        findFirst: jest.fn().mockResolvedValue(sesionConItems),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      transaccionDePago: {
        upsert: jest.fn().mockResolvedValue({ id: 'transaccion-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((operaciones: Promise<unknown>[]) => Promise.all(operaciones)),
    };
    servicio = new PagosServicio(
      prisma as unknown as PrismaServicio,
      new ProveedorDePagoSimulado(),
    );
  });

  it('pago aprobado: cobra el total de SNAPSHOTS, pasa a PAGADA y genera el código de egreso', async () => {
    const resultado = await servicio.pagar(usuario, 'sesion-1');

    expect(resultado.totalCentavos).toBe(250000);
    expect(resultado.estadoPago).toBe(EstadoPago.APROBADO);
    expect(resultado.estadoSesion).toBe(EstadoSesion.PAGADA);
    expect(resultado.codigoEgreso).toBeTruthy();

    // La transacción quedó por el monto exacto y a nombre del proveedor simulado.
    expect(prisma.transaccionDePago.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tenantId: 'tenant-a',
          montoCentavos: 250000,
          proveedor: 'simulado',
        }),
      }),
    );
    // La sesión quedó PAGADA con el mismo código que se devolvió.
    expect(prisma.sesionDeCompra.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: EstadoSesion.PAGADA,
          codigoEgreso: resultado.codigoEgreso,
        }),
      }),
    );
  });

  it('pago rechazado (centavos terminan en 99): sin código y la sesión vuelve a ACTIVA', async () => {
    prisma.sesionDeCompra.findFirst.mockResolvedValue({
      ...sesionConItems,
      eventos: [{ snapshotPrecioCentavos: 123499, cantidad: 1 }],
    });

    const resultado = await servicio.pagar(usuario, 'sesion-1');

    expect(resultado.estadoPago).toBe(EstadoPago.RECHAZADO);
    expect(resultado.estadoSesion).toBe(EstadoSesion.ACTIVA);
    expect(resultado.codigoEgreso).toBeNull();
    expect(prisma.sesionDeCompra.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estado: EstadoSesion.ACTIVA } }),
    );
  });

  it('no se puede pagar un carrito vacío', async () => {
    prisma.sesionDeCompra.findFirst.mockResolvedValue({ ...sesionConItems, eventos: [] });
    await expect(servicio.pagar(usuario, 'sesion-1')).rejects.toThrow(BadRequestException);
    expect(prisma.transaccionDePago.upsert).not.toHaveBeenCalled();
  });

  it('no se puede pagar una sesión que no está ACTIVA', async () => {
    prisma.sesionDeCompra.findFirst.mockResolvedValue({
      ...sesionConItems,
      estado: EstadoSesion.PAGADA,
    });
    await expect(servicio.pagar(usuario, 'sesion-1')).rejects.toThrow('PAGADA');
  });

  it('doble tap: si otra request ganó la transición ACTIVA→PENDIENTE_PAGO, corta con conflicto', async () => {
    prisma.sesionDeCompra.updateMany.mockResolvedValue({ count: 0 });
    await expect(servicio.pagar(usuario, 'sesion-1')).rejects.toThrow(ConflictException);
    expect(prisma.transaccionDePago.upsert).not.toHaveBeenCalled();
  });
});

describe('ProveedorDePagoSimulado', () => {
  it('aprueba montos normales y rechaza los que terminan en 99 centavos', async () => {
    const proveedor = new ProveedorDePagoSimulado();

    const ok = await proveedor.crearPago({
      sesionId: 's',
      tenantId: 't',
      montoCentavos: 250000,
      descripcion: 'x',
    });
    const rechazo = await proveedor.crearPago({
      sesionId: 's',
      tenantId: 't',
      montoCentavos: 123499,
      descripcion: 'x',
    });

    await expect(
      proveedor.procesarNotificacion({ referenciaExterna: ok.referenciaExterna }),
    ).resolves.toMatchObject({ estado: 'APROBADO' });
    await expect(
      proveedor.procesarNotificacion({ referenciaExterna: rechazo.referenciaExterna }),
    ).resolves.toMatchObject({ estado: 'RECHAZADO' });
  });

  it('una referencia desconocida se rechaza (no inventa aprobaciones)', async () => {
    const proveedor = new ProveedorDePagoSimulado();
    await expect(
      proveedor.procesarNotificacion({ referenciaExterna: 'SIM-inexistente' }),
    ).resolves.toMatchObject({ estado: 'RECHAZADO' });
  });
});
