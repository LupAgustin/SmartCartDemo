import { ConflictException, NotFoundException } from '@nestjs/common';
import { EstadoSesion, ResultadoValidacion, RolUsuario } from '@prisma/client';
import { PrismaServicio } from '../../prisma/prisma.servicio';
import { UsuarioAutenticado } from '../auth/auth.tipos';
import { ValidacionEgresoServicio } from './validacion-egreso.servicio';

const operador: UsuarioAutenticado = {
  id: 'operador-1',
  tenantId: 'tenant-a',
  email: 'operador@superdemo.com.ar',
  rol: RolUsuario.OPERADOR_EGRESO,
};

const sesionPagada = {
  id: 'sesion-1',
  tenantId: 'tenant-a',
  estado: EstadoSesion.PAGADA,
  codigoEgreso: 'qr-123',
};

describe('ValidacionEgresoServicio: QR de egreso de UN SOLO USO', () => {
  let prisma: any;
  let servicio: ValidacionEgresoServicio;

  beforeEach(() => {
    prisma = {
      sesionDeCompra: {
        findFirst: jest.fn().mockResolvedValue(sesionPagada),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      validacionDeEgreso: {
        create: jest.fn().mockResolvedValue({ id: 'validacion-1' }),
      },
    };
    servicio = new ValidacionEgresoServicio(prisma as unknown as PrismaServicio);
  });

  it('la primera validación consume el QR: sesión PAGADA → VALIDADA y queda el registro', async () => {
    const resultado = await servicio.registrar(operador, 'qr-123', ResultadoValidacion.APROBADA);

    expect(resultado.estado).toBe(EstadoSesion.VALIDADA);
    // La transición exige estado PAGADA (guarda de un solo uso).
    expect(prisma.sesionDeCompra.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: 'tenant-a',
        id: 'sesion-1',
        estado: EstadoSesion.PAGADA,
      }),
      data: { estado: EstadoSesion.VALIDADA },
    });
    expect(prisma.validacionDeEgreso.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-a',
        sesionId: 'sesion-1',
        operadorId: 'operador-1',
        resultado: ResultadoValidacion.APROBADA,
      }),
    });
  });

  it('el SEGUNDO uso del mismo QR se rechaza con "ya fue utilizado"', async () => {
    prisma.sesionDeCompra.findFirst.mockResolvedValue({
      ...sesionPagada,
      estado: EstadoSesion.VALIDADA,
    });
    prisma.sesionDeCompra.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      servicio.registrar(operador, 'qr-123', ResultadoValidacion.APROBADA),
    ).rejects.toThrow('ya fue utilizado');
    expect(prisma.validacionDeEgreso.create).not.toHaveBeenCalled();
  });

  it('carrera: dos operadores escanean a la vez, solo gana el que logra la transición', async () => {
    // findFirst todavía ve PAGADA, pero otro request validó en el medio.
    prisma.sesionDeCompra.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      servicio.registrar(operador, 'qr-123', ResultadoValidacion.APROBADA),
    ).rejects.toThrow(ConflictException);
    expect(prisma.validacionDeEgreso.create).not.toHaveBeenCalled();
  });

  it('una sesión sin pagar no admite validación', async () => {
    prisma.sesionDeCompra.findFirst.mockResolvedValue({
      ...sesionPagada,
      estado: EstadoSesion.ACTIVA,
    });
    prisma.sesionDeCompra.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      servicio.registrar(operador, 'qr-123', ResultadoValidacion.APROBADA),
    ).rejects.toThrow('ACTIVA');
  });

  it('código inexistente da 404', async () => {
    prisma.sesionDeCompra.findFirst.mockResolvedValue(null);
    await expect(
      servicio.registrar(operador, 'qr-falso', ResultadoValidacion.APROBADA),
    ).rejects.toThrow(NotFoundException);
  });

  it('aislamiento multi-tenant: la búsqueda del código siempre filtra por el tenant del operador', async () => {
    await servicio.buscarPorCodigo(operador, 'qr-123').catch(() => undefined);
    expect(prisma.sesionDeCompra.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a', codigoEgreso: 'qr-123' }),
      }),
    );
  });
});
