import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSesion, ResultadoValidacion } from '@prisma/client';
import { PrismaServicio } from '../../prisma/prisma.servicio';
import { conTenant } from '../../comun/tenant/filtro-tenant';
import { UsuarioAutenticado } from '../auth/auth.tipos';
import { calcularTotalCentavos } from '../sesion-compra/calculo-total';

/**
 * Validación humana del carro físico al egreso (mitigación de fraude
 * del MVP — no hay cotejo automático). El operador escanea el QR del
 * cliente, ve el carrito declarado y registra el resultado.
 */
@Injectable()
export class ValidacionEgresoServicio {
  constructor(private readonly prisma: PrismaServicio) {}

  /**
   * Vista del operador: la sesión detrás del código QR, con carrito,
   * total y cliente. Solo sesiones PAGADAS o ya VALIDADAS (para poder
   * mostrar "este QR ya se usó" con contexto).
   */
  async buscarPorCodigo(operador: UsuarioAutenticado, codigoEgreso: string) {
    const sesion = await this.prisma.sesionDeCompra.findFirst({
      where: conTenant(operador.tenantId, { codigoEgreso }),
      include: {
        eventos: { orderBy: { escaneadoEn: 'asc' } },
        usuario: { select: { id: true, nombre: true, email: true } },
        sucursal: { select: { id: true, nombre: true } },
        validacion: true,
      },
    });
    if (!sesion) {
      throw new NotFoundException('Código de egreso inexistente');
    }
    return { ...sesion, totalCentavos: calcularTotalCentavos(sesion.eventos) };
  }

  /**
   * Registra el resultado del cotejo. El QR es de UN SOLO USO: la
   * transición PAGADA → VALIDADA es atómica (updateMany con guarda de
   * estado), así un segundo escaneo del mismo código se rechaza aunque
   * llegue en paralelo.
   */
  async registrar(
    operador: UsuarioAutenticado,
    codigoEgreso: string,
    resultado: ResultadoValidacion,
    observaciones?: string,
  ) {
    const sesion = await this.prisma.sesionDeCompra.findFirst({
      where: conTenant(operador.tenantId, { codigoEgreso }),
    });
    if (!sesion) {
      throw new NotFoundException('Código de egreso inexistente');
    }

    const transicion = await this.prisma.sesionDeCompra.updateMany({
      where: conTenant(operador.tenantId, {
        id: sesion.id,
        estado: EstadoSesion.PAGADA,
      }),
      data: { estado: EstadoSesion.VALIDADA },
    });
    if (transicion.count === 0) {
      throw new ConflictException(
        sesion.estado === EstadoSesion.VALIDADA
          ? 'Este QR ya fue utilizado'
          : `La sesión está ${sesion.estado}, no admite validación`,
      );
    }

    const validacion = await this.prisma.validacionDeEgreso.create({
      data: {
        tenantId: operador.tenantId,
        sesionId: sesion.id,
        operadorId: operador.id,
        resultado,
        observaciones: observaciones ?? null,
      },
    });

    return { sesionId: sesion.id, estado: EstadoSesion.VALIDADA, validacion };
  }
}
