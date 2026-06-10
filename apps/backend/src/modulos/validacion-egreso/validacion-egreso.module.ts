import { Module } from '@nestjs/common';
import { ValidacionEgresoController } from './validacion-egreso.controller';
import { ValidacionEgresoServicio } from './validacion-egreso.servicio';

/**
 * Módulo de validación de egreso: vista del operador con el carrito
 * declarado del usuario y registro del resultado del cotejo humano.
 * El MVP no automatiza el cotejo: la validación humana es la
 * mitigación de fraude. El QR de egreso es de un solo uso.
 */
@Module({
  controllers: [ValidacionEgresoController],
  providers: [ValidacionEgresoServicio],
})
export class ValidacionEgresoModule {}
