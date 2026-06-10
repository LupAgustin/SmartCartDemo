import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaServicio } from '../../prisma/prisma.servicio';
import { conTenant } from '../../comun/tenant/filtro-tenant';
import {
  AdaptadorFuenteCatalogo,
  ResultadoSincronizacion,
} from './adaptadores/adaptador-fuente-catalogo';
import { reconciliarCatalogo } from './reconciliacion';

/** Token de inyección del adaptador de fuente activo (MVP: CSV). */
export const ADAPTADOR_CATALOGO = Symbol('ADAPTADOR_CATALOGO');

/**
 * Orquesta la sincronización del catálogo: lee de la fuente a través
 * del adaptador, reconcilia contra el cache y aplica altas, bajas
 * lógicas y cambios de precio. Cada corrida queda auditada en
 * registros_sincronizacion (métrica del panel B2B).
 */
@Injectable()
export class SincronizacionServicio {
  private readonly logger = new Logger('SincronizacionCatalogo');

  constructor(
    private readonly prisma: PrismaServicio,
    @Inject(ADAPTADOR_CATALOGO) private readonly adaptador: AdaptadorFuenteCatalogo,
  ) {}

  /** Corrida diaria a las 03:00 (criterio: sincronizar al menos 1 vez/día). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async sincronizarTodosLosTenants(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({ where: { activo: true } });
    for (const tenant of tenants) {
      try {
        await this.sincronizarTenant(tenant.id);
      } catch (error) {
        // Un tenant con la fuente rota no debe frenar a los demás.
        this.logger.error(`Sincronización fallida para tenant ${tenant.slug}: ${error}`);
      }
    }
  }

  /** Sincroniza el catálogo de UN tenant y devuelve el resumen de la corrida. */
  async sincronizarTenant(tenantId: string): Promise<ResultadoSincronizacion> {
    const inicio = Date.now();
    const errores: string[] = [];

    const productosFuente = await this.adaptador.obtenerProductos(tenantId);
    const cacheados = await this.prisma.productoCatalogo.findMany({
      where: conTenant(tenantId),
      select: { ean: true, nombre: true, marca: true, precioActualCentavos: true, activo: true },
    });

    const plan = reconciliarCatalogo(cacheados, productosFuente);

    // Todo el plan se aplica en una transacción: o entra completo o no entra.
    await this.prisma.$transaction(async (tx) => {
      if (plan.altas.length > 0) {
        await tx.productoCatalogo.createMany({
          data: plan.altas.map((p) => ({
            tenantId,
            ean: p.ean,
            nombre: p.nombre,
            marca: p.marca ?? null,
            precioActualCentavos: p.precioCentavos,
            activo: p.activo,
          })),
        });
      }
      for (const cambio of plan.cambios) {
        await tx.productoCatalogo.update({
          where: { tenantId_ean: { tenantId, ean: cambio.ean } },
          data: {
            nombre: cambio.nombre,
            marca: cambio.marca ?? null,
            precioActualCentavos: cambio.precioCentavos,
            activo: cambio.activo,
          },
        });
      }
      if (plan.bajas.length > 0) {
        await tx.productoCatalogo.updateMany({
          where: conTenant(tenantId, { ean: { in: plan.bajas } }),
          data: { activo: false },
        });
      }
    });

    const resultado: ResultadoSincronizacion = {
      altas: plan.altas.length,
      bajas: plan.bajas.length,
      cambiosDePrecio: plan.cambios.length,
      sinCambios: plan.sinCambios,
      errores,
      duracionMs: Date.now() - inicio,
    };

    await this.prisma.registroSincronizacion.create({
      data: { tenantId, fuente: this.adaptador.fuente, ...resultado },
    });

    this.logger.log(
      `Tenant ${tenantId}: ${resultado.altas} altas, ${resultado.bajas} bajas, ` +
        `${resultado.cambiosDePrecio} cambios, ${resultado.sinCambios} sin cambios (${resultado.duracionMs}ms)`,
    );
    return resultado;
  }
}
