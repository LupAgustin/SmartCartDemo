import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { validar } from '../../comun/validacion';
import { UsuarioActual } from '../auth/decoradores';
import { UsuarioAutenticado } from '../auth/auth.tipos';
import { SesionCompraServicio } from './sesion-compra.servicio';

const esquemaIniciar = z.object({
  sucursalId: z.string().uuid('sucursalId inválido'),
});

const esquemaEscaneo = z.object({
  ean: z.string().regex(/^\d{8,14}$/, 'EAN inválido'),
  cantidad: z.number().int().positive().max(99).optional(),
});

const esquemaCantidad = z.object({
  cantidad: z.number().int().min(0).max(99),
});

@Controller('sesiones')
export class SesionCompraController {
  constructor(private readonly sesiones: SesionCompraServicio) {}

  /** Inicia (o retoma) la sesión de compra en una sucursal. */
  @Post()
  iniciar(@UsuarioActual() usuario: UsuarioAutenticado, @Body() cuerpo: unknown) {
    const { sucursalId } = validar(esquemaIniciar, cuerpo);
    return this.sesiones.iniciar(usuario, sucursalId);
  }

  /** Devuelve la sesión con carrito y total en centavos. */
  @Get(':id')
  obtener(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.sesiones.obtener(usuario, id);
  }

  /** Registra un escaneo (acá nace el snapshot de precio). */
  @Post(':id/escaneos')
  escanear(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() cuerpo: unknown,
  ) {
    const { ean, cantidad } = validar(esquemaEscaneo, cuerpo);
    return this.sesiones.registrarEscaneo(usuario, id, ean, cantidad ?? 1);
  }

  /** Cambia la cantidad de un ítem (0 lo quita). */
  @Patch(':id/eventos/:eventoId')
  actualizarCantidad(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Param('eventoId') eventoId: string,
    @Body() cuerpo: unknown,
  ) {
    const { cantidad } = validar(esquemaCantidad, cuerpo);
    return this.sesiones.actualizarCantidad(usuario, id, eventoId, cantidad);
  }

  /** Quita un ítem del carrito. */
  @Delete(':id/eventos/:eventoId')
  quitarItem(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Param('eventoId') eventoId: string,
  ) {
    return this.sesiones.actualizarCantidad(usuario, id, eventoId, 0);
  }

  /** Cancela la sesión (vacía el carrito). */
  @Post(':id/cancelar')
  cancelar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.sesiones.cancelar(usuario, id);
  }
}
