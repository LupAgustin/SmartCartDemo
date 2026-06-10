import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSesion } from '@prisma/client';
import { PrismaServicio } from '../../prisma/prisma.servicio';
import { conTenant, crearConTenant } from '../../comun/tenant/filtro-tenant';
import { UsuarioAutenticado } from '../auth/auth.tipos';
import { CatalogoServicio } from '../catalogo/catalogo.servicio';
import { calcularTotalCentavos } from './calculo-total';

@Injectable()
export class SesionCompraServicio {
  constructor(
    private readonly prisma: PrismaServicio,
    private readonly catalogo: CatalogoServicio,
  ) {}

  /**
   * Inicia una sesión de compra en una sucursal.
   * Si el usuario ya tiene una sesión ACTIVA en esa sucursal, se
   * retoma (soporta cerrar y reabrir la app sin perder el carrito).
   */
  async iniciar(usuario: UsuarioAutenticado, sucursalId: string) {
    const sucursal = await this.prisma.sucursal.findFirst({
      where: conTenant(usuario.tenantId, { id: sucursalId, activa: true }),
    });
    if (!sucursal) {
      throw new NotFoundException('Sucursal inexistente o inactiva');
    }

    const activa = await this.prisma.sesionDeCompra.findFirst({
      where: conTenant(usuario.tenantId, {
        usuarioId: usuario.id,
        estado: EstadoSesion.ACTIVA,
      }),
    });
    if (activa) {
      // Si la sesión activa es de otra sucursal, se cancela y se abre una nueva.
      if (activa.sucursalId === sucursalId) {
        return this.obtener(usuario, activa.id);
      }
      await this.prisma.sesionDeCompra.update({
        where: { id: activa.id },
        data: { estado: EstadoSesion.CANCELADA, finalizadaEn: new Date() },
      });
    }

    const sesion = await this.prisma.sesionDeCompra.create({
      data: crearConTenant(usuario.tenantId, {
        sucursalId,
        usuarioId: usuario.id,
      }),
    });
    return this.obtener(usuario, sesion.id);
  }

  /** Devuelve la sesión con sus eventos y el total calculado sobre snapshots. */
  async obtener(usuario: UsuarioAutenticado, sesionId: string) {
    const sesion = await this.prisma.sesionDeCompra.findFirst({
      where: conTenant(usuario.tenantId, { id: sesionId }),
      include: {
        eventos: { orderBy: { escaneadoEn: 'asc' } },
        sucursal: { select: { id: true, nombre: true } },
      },
    });
    if (!sesion) {
      throw new NotFoundException('Sesión inexistente');
    }
    if (sesion.usuarioId !== usuario.id && usuario.rol === 'CLIENTE') {
      // Un cliente solo ve sus propias sesiones; operador/admin del
      // tenant pueden consultarlas (vista de egreso, Sprint 3).
      throw new ForbiddenException('La sesión no te pertenece');
    }
    return { ...sesion, totalCentavos: calcularTotalCentavos(sesion.eventos) };
  }

  /**
   * Registra un escaneo y toma el SNAPSHOT de precio en este instante.
   * Si el catálogo cambia el precio después, este evento no se toca:
   * se cobra lo que el cliente vio al escanear.
   */
  async registrarEscaneo(
    usuario: UsuarioAutenticado,
    sesionId: string,
    ean: string,
    cantidad = 1,
  ) {
    const sesion = await this.exigirSesionActiva(usuario, sesionId);

    // Si el EAN no existe, esto registra la alerta interna y corta
    // con 404 PRODUCTO_DESCONOCIDO (la app ofrece búsqueda manual).
    const producto = await this.catalogo.buscarPorEan(usuario.tenantId, ean);

    // Mismo producto y mismo precio → acumulamos cantidad en el evento
    // existente. Si el precio cambió entre escaneos, se crea otro evento:
    // cada snapshot es inmutable.
    const eventoExistente = await this.prisma.eventoDeEscaneo.findFirst({
      where: conTenant(usuario.tenantId, {
        sesionId: sesion.id,
        ean,
        snapshotPrecioCentavos: producto.precioActualCentavos,
      }),
    });

    if (eventoExistente) {
      await this.prisma.eventoDeEscaneo.update({
        where: { id: eventoExistente.id },
        data: { cantidad: { increment: cantidad } },
      });
    } else {
      await this.prisma.eventoDeEscaneo.create({
        data: crearConTenant(usuario.tenantId, {
          sesionId: sesion.id,
          productoId: producto.id,
          ean: producto.ean,
          nombreProducto: producto.nombre,
          snapshotPrecioCentavos: producto.precioActualCentavos,
          cantidad,
        }),
      });
    }

    return this.obtener(usuario, sesion.id);
  }

  /** Cambia la cantidad de un ítem del carrito (0 = quitarlo). */
  async actualizarCantidad(
    usuario: UsuarioAutenticado,
    sesionId: string,
    eventoId: string,
    cantidad: number,
  ) {
    const sesion = await this.exigirSesionActiva(usuario, sesionId);
    const evento = await this.prisma.eventoDeEscaneo.findFirst({
      where: conTenant(usuario.tenantId, { id: eventoId, sesionId: sesion.id }),
    });
    if (!evento) {
      throw new NotFoundException('El ítem no está en el carrito');
    }

    if (cantidad <= 0) {
      await this.prisma.eventoDeEscaneo.delete({ where: { id: evento.id } });
    } else {
      await this.prisma.eventoDeEscaneo.update({
        where: { id: evento.id },
        data: { cantidad },
      });
    }
    return this.obtener(usuario, sesion.id);
  }

  /** Cancela la sesión activa (vaciar carrito y salir). */
  async cancelar(usuario: UsuarioAutenticado, sesionId: string) {
    const sesion = await this.exigirSesionActiva(usuario, sesionId);
    await this.prisma.sesionDeCompra.update({
      where: { id: sesion.id },
      data: { estado: EstadoSesion.CANCELADA, finalizadaEn: new Date() },
    });
    return { id: sesion.id, estado: EstadoSesion.CANCELADA };
  }

  /** La sesión debe existir, ser del usuario y estar ACTIVA para mutarla. */
  private async exigirSesionActiva(usuario: UsuarioAutenticado, sesionId: string) {
    const sesion = await this.prisma.sesionDeCompra.findFirst({
      where: conTenant(usuario.tenantId, { id: sesionId, usuarioId: usuario.id }),
    });
    if (!sesion) {
      throw new NotFoundException('Sesión inexistente');
    }
    if (sesion.estado !== EstadoSesion.ACTIVA) {
      throw new BadRequestException(`La sesión está ${sesion.estado}, no admite cambios`);
    }
    return sesion;
  }
}
