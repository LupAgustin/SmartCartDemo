import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ResultadoValidacion, RolUsuario } from '@prisma/client';
import { z } from 'zod';
import { validar } from '../../comun/validacion';
import { Roles, UsuarioActual } from '../auth/decoradores';
import { UsuarioAutenticado } from '../auth/auth.tipos';
import { ValidacionEgresoServicio } from './validacion-egreso.servicio';

const esquemaRegistro = z.object({
  resultado: z.nativeEnum(ResultadoValidacion),
  observaciones: z.string().max(500).optional(),
});

/** Solo el personal del súper opera el egreso. */
@Roles(RolUsuario.OPERADOR_EGRESO, RolUsuario.ADMIN_TENANT)
@Controller('validacion-egreso')
export class ValidacionEgresoController {
  constructor(private readonly validacion: ValidacionEgresoServicio) {}

  /** Vista del operador: carrito declarado detrás del QR escaneado. */
  @Get(':codigo')
  buscar(@UsuarioActual() operador: UsuarioAutenticado, @Param('codigo') codigo: string) {
    return this.validacion.buscarPorCodigo(operador, codigo);
  }

  /** Registra el resultado del cotejo humano (consume el QR). */
  @Post(':codigo')
  registrar(
    @UsuarioActual() operador: UsuarioAutenticado,
    @Param('codigo') codigo: string,
    @Body() cuerpo: unknown,
  ) {
    const { resultado, observaciones } = validar(esquemaRegistro, cuerpo);
    return this.validacion.registrar(operador, codigo, resultado, observaciones);
  }
}
