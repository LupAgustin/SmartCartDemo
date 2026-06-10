import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaServicio } from '../../prisma/prisma.servicio';
import { conTenant } from '../../comun/tenant/filtro-tenant';

@Injectable()
export class CatalogoServicio {
  constructor(private readonly prisma: PrismaServicio) {}

  /**
   * Busca un producto activo por EAN dentro del tenant.
   * Si no existe, registra/acumula la alerta interna de producto
   * desconocido (regla de negocio: el flujo no se rompe, pero queda
   * rastro para revisar la sincronización) y responde 404 con código
   * PRODUCTO_DESCONOCIDO para que la app ofrezca búsqueda manual.
   */
  async buscarPorEan(tenantId: string, ean: string) {
    const producto = await this.prisma.productoCatalogo.findFirst({
      where: conTenant(tenantId, { ean, activo: true }),
    });
    if (!producto) {
      await this.registrarProductoDesconocido(tenantId, ean);
      throw new NotFoundException({
        codigo: 'PRODUCTO_DESCONOCIDO',
        mensaje: 'El producto no está en el catálogo',
        ean,
      });
    }
    return producto;
  }

  /**
   * Búsqueda por nombre/marca para el fallback de producto desconocido.
   * ILIKE con índice por tenant alcanza para ~30K SKUs (<800ms);
   * si un catálogo real lo supera, se agrega pg_trgm.
   */
  async buscarPorNombre(tenantId: string, texto: string, limite = 20) {
    const termino = texto.trim();
    if (termino.length < 2) return [];
    return this.prisma.productoCatalogo.findMany({
      where: conTenant(tenantId, {
        activo: true,
        OR: [
          { nombre: { contains: termino, mode: 'insensitive' as const } },
          { marca: { contains: termino, mode: 'insensitive' as const } },
        ],
      }),
      orderBy: { nombre: 'asc' },
      take: limite,
    });
  }

  /** Acumula la alerta de EAN desconocido (una fila por tenant+ean). */
  private async registrarProductoDesconocido(tenantId: string, ean: string): Promise<void> {
    await this.prisma.alertaCatalogo.upsert({
      where: { tenantId_ean: { tenantId, ean } },
      update: { contador: { increment: 1 }, resuelta: false },
      create: { tenantId, ean },
    });
  }
}
