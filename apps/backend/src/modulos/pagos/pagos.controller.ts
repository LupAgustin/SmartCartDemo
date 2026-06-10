import { Controller, Param, Post } from '@nestjs/common';
import { UsuarioActual } from '../auth/decoradores';
import { UsuarioAutenticado } from '../auth/auth.tipos';
import { PagosServicio } from './pagos.servicio';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagos: PagosServicio) {}

  /** Paga la sesión activa. Exige conexión: sin red no hay pago. */
  @Post('sesiones/:sesionId')
  pagar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('sesionId') sesionId: string) {
    return this.pagos.pagar(usuario, sesionId);
  }
}
