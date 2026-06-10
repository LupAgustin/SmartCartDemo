import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoPago, EstadoSesion } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaServicio } from '../../prisma/prisma.servicio';
import { conTenant } from '../../comun/tenant/filtro-tenant';
import { UsuarioAutenticado } from '../auth/auth.tipos';
import { calcularTotalCentavos } from '../sesion-compra/calculo-total';
import { PROVEEDOR_DE_PAGO, ProveedorDePago } from './proveedor-de-pago';

export interface ResultadoPago {
  sesionId: string;
  estadoPago: EstadoPago;
  estadoSesion: EstadoSesion;
  totalCentavos: number;
  /** Token del QR de egreso (solo si el pago fue aprobado). */
  codigoEgreso: string | null;
}

/**
 * Orquesta el pago de una sesión de compra contra el ProveedorDePago
 * activo. El pago EXIGE conexión (decisión de negocio): no se encola
 * nada offline — si esta request no llega, no hay pago.
 */
@Injectable()
export class PagosServicio {
  constructor(
    private readonly prisma: PrismaServicio,
    @Inject(PROVEEDOR_DE_PAGO) private readonly proveedor: ProveedorDePago,
  ) {}

  /**
   * Cobra la sesión: el monto es SIEMPRE la suma de los snapshots de
   * precio (nunca el precio actual del catálogo). Si el proveedor
   * aprueba, la sesión pasa a PAGADA y nace el código del QR de egreso.
   */
  async pagar(usuario: UsuarioAutenticado, sesionId: string): Promise<ResultadoPago> {
    const sesion = await this.prisma.sesionDeCompra.findFirst({
      where: conTenant(usuario.tenantId, { id: sesionId, usuarioId: usuario.id }),
      include: { eventos: true },
    });
    if (!sesion) {
      throw new NotFoundException('Sesión inexistente');
    }
    if (sesion.estado !== EstadoSesion.ACTIVA) {
      throw new BadRequestException(`La sesión está ${sesion.estado}, no se puede pagar`);
    }
    if (sesion.eventos.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    const totalCentavos = calcularTotalCentavos(sesion.eventos);

    // Transición atómica ACTIVA → PENDIENTE_PAGO: si otra request pagó
    // primero (doble tap), count es 0 y se corta acá.
    const bloqueo = await this.prisma.sesionDeCompra.updateMany({
      where: conTenant(usuario.tenantId, { id: sesion.id, estado: EstadoSesion.ACTIVA }),
      data: { estado: EstadoSesion.PENDIENTE_PAGO },
    });
    if (bloqueo.count === 0) {
      throw new ConflictException('La sesión ya tiene un pago en curso');
    }

    const transaccion = await this.prisma.transaccionDePago.upsert({
      where: { sesionId: sesion.id },
      update: { estado: EstadoPago.PENDIENTE, montoCentavos: totalCentavos },
      create: {
        tenantId: usuario.tenantId,
        sesionId: sesion.id,
        proveedor: this.proveedor.nombre,
        montoCentavos: totalCentavos,
      },
    });

    const creacion = await this.proveedor.crearPago({
      sesionId: sesion.id,
      tenantId: usuario.tenantId,
      montoCentavos: totalCentavos,
      descripcion: `Compra SmartCart (${sesion.eventos.length} ítems)`,
    });

    // Con el proveedor simulado la confirmación es inmediata; con uno
    // real este paso se muda al webhook. // TODO: integración real
    const notificacion = await this.proveedor.procesarNotificacion({
      referenciaExterna: creacion.referenciaExterna,
    });

    const aprobado = notificacion.estado === 'APROBADO';
    const codigoEgreso = aprobado ? randomUUID() : null;

    await this.prisma.$transaction([
      this.prisma.transaccionDePago.update({
        where: { id: transaccion.id },
        data: {
          estado: aprobado ? EstadoPago.APROBADO : EstadoPago.RECHAZADO,
          referenciaExterna: creacion.referenciaExterna,
          payloadWebhook: JSON.parse(JSON.stringify(notificacion.payloadCrudo ?? null)),
        },
      }),
      this.prisma.sesionDeCompra.update({
        where: { id: sesion.id },
        data: aprobado
          ? { estado: EstadoSesion.PAGADA, codigoEgreso, finalizadaEn: new Date() }
          : // Pago rechazado: la sesión vuelve a ACTIVA para reintentar.
            { estado: EstadoSesion.ACTIVA },
      }),
    ]);

    return {
      sesionId: sesion.id,
      estadoPago: aprobado ? EstadoPago.APROBADO : EstadoPago.RECHAZADO,
      estadoSesion: aprobado ? EstadoSesion.PAGADA : EstadoSesion.ACTIVA,
      totalCentavos,
      codigoEgreso,
    };
  }
}
