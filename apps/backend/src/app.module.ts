import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { SaludModule } from './salud/salud.module';
import { AuthModule } from './modulos/auth/auth.module';
import { TenantsModule } from './modulos/tenants/tenants.module';
import { SucursalesModule } from './modulos/sucursales/sucursales.module';
import { CatalogoModule } from './modulos/catalogo/catalogo.module';
import { SesionCompraModule } from './modulos/sesion-compra/sesion-compra.module';
import { PagosModule } from './modulos/pagos/pagos.module';
import { ValidacionEgresoModule } from './modulos/validacion-egreso/validacion-egreso.module';
import { MetricasModule } from './modulos/metricas/metricas.module';
import { SERVICIO_ANALYTICS, ServicioAnalyticsNoOp } from './observabilidad/analytics.servicio';

/**
 * Monolito modular de SmartCart.
 * Cada módulo tiene límites limpios para poder separarse a futuro
 * sin reescritura (decisión de arquitectura cerrada).
 */
@Module({
  imports: [
    PrismaModule,
    SaludModule,
    AuthModule,
    TenantsModule,
    SucursalesModule,
    CatalogoModule,
    SesionCompraModule,
    PagosModule,
    ValidacionEgresoModule,
    MetricasModule,
  ],
  providers: [
    { provide: SERVICIO_ANALYTICS, useClass: ServicioAnalyticsNoOp },
  ],
})
export class AppModule {}
