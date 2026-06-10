import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { Roles, UsuarioActual } from '../auth/decoradores';
import { UsuarioAutenticado } from '../auth/auth.tipos';
import { CatalogoServicio } from './catalogo.servicio';
import { SincronizacionServicio } from './sincronizacion.servicio';

@Controller('catalogo')
export class CatalogoController {
  constructor(
    private readonly catalogo: CatalogoServicio,
    private readonly sincronizacion: SincronizacionServicio,
  ) {}

  /** Consulta de producto por código de barras (flujo de escaneo). */
  @Get('productos/ean/:ean')
  buscarPorEan(@UsuarioActual() usuario: UsuarioAutenticado, @Param('ean') ean: string) {
    return this.catalogo.buscarPorEan(usuario.tenantId, ean);
  }

  /** Búsqueda por nombre (fallback cuando falla el escaneo). */
  @Get('productos')
  buscarPorNombre(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query('buscar') buscar = '',
  ) {
    return this.catalogo.buscarPorNombre(usuario.tenantId, buscar);
  }

  /** Dispara la sincronización manual del catálogo (admin del súper). */
  @Roles(RolUsuario.ADMIN_TENANT, RolUsuario.ADMIN_PLATAFORMA)
  @Post('sincronizar')
  sincronizar(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.sincronizacion.sincronizarTenant(usuario.tenantId);
  }
}
