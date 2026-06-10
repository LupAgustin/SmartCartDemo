import { Controller, Get } from '@nestjs/common';
import { PrismaServicio } from '../../prisma/prisma.servicio';
import { conTenant } from '../../comun/tenant/filtro-tenant';
import { UsuarioActual } from '../auth/decoradores';
import { UsuarioAutenticado } from '../auth/auth.tipos';

@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly prisma: PrismaServicio) {}

  /**
   * Sucursales activas del tenant, con lat/long y radio de geofence.
   * La app las usa para detectar la sucursal por ubicación (50m) y
   * como lista para la selección manual de respaldo.
   */
  @Get()
  listar(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.prisma.sucursal.findMany({
      where: conTenant(usuario.tenantId, { activa: true }),
      orderBy: { nombre: 'asc' },
    });
  }
}
