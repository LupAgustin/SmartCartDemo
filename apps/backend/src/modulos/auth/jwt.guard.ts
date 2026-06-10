import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { RolUsuario } from '@prisma/client';
import { ES_PUBLICO, ROLES_REQUERIDOS } from './decoradores';
import { PayloadJwt, UsuarioAutenticado } from './auth.tipos';

/**
 * Guard global de autenticación y autorización.
 * - Verifica el Bearer token y cuelga `request.usuario` (con tenantId).
 * - Deja pasar rutas marcadas con @Publico().
 * - Si la ruta tiene @Roles(...), exige que el rol del usuario esté incluido.
 *
 * El tenantId del request SIEMPRE sale de acá (del token firmado),
 * nunca de un header o del body: es la base del aislamiento multi-tenant.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublico = this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublico) return true;

    const request = contexto.switchToHttp().getRequest();
    const encabezado: string | undefined = request.headers?.authorization;
    const token = encabezado?.startsWith('Bearer ') ? encabezado.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException('Falta el token de autenticación');
    }

    let payload: PayloadJwt;
    try {
      payload = await this.jwt.verifyAsync<PayloadJwt>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o vencido');
    }

    const usuario: UsuarioAutenticado = {
      id: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      rol: payload.rol,
    };
    request.usuario = usuario;

    const rolesRequeridos = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_REQUERIDOS, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (rolesRequeridos?.length && !rolesRequeridos.includes(usuario.rol)) {
      throw new ForbiddenException('No tenés permisos para esta operación');
    }

    return true;
  }
}
