import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { SesionCompraController } from './sesion-compra.controller';
import { SesionCompraServicio } from './sesion-compra.servicio';

/**
 * Módulo de sesión de compra: el corazón del flujo scan & go.
 * Cada escaneo guarda un SNAPSHOT del precio (regla de negocio: se
 * cobra el precio del momento del escaneo, no el de góndola al pagar).
 */
@Module({
  imports: [CatalogoModule],
  controllers: [SesionCompraController],
  providers: [SesionCompraServicio],
  exports: [SesionCompraServicio],
})
export class SesionCompraModule {}
