import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { UsuarioAutenticado } from './auth.tipos';

/** Clave de metadata para rutas públicas (sin JWT). */
export const ES_PUBLICO = 'esPublico';

/** Marca una ruta como pública: el guard global de JWT la deja pasar. */
export const Publico = () => SetMetadata(ES_PUBLICO, true);

/** Clave de metadata para restricción por rol. */
export const ROLES_REQUERIDOS = 'rolesRequeridos';

/** Restringe una ruta a ciertos roles del tenant. */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_REQUERIDOS, roles);

/** Inyecta el usuario autenticado (puesto en el request por el guard JWT). */
export const UsuarioActual = createParamDecorator(
  (_datos: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const request = contexto.switchToHttp().getRequest();
    return request.usuario;
  },
);
