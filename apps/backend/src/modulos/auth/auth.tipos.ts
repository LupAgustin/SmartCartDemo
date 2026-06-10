import { RolUsuario } from '@prisma/client';

/** Identidad autenticada que viaja en cada request (sale del JWT). */
export interface UsuarioAutenticado {
  id: string;
  tenantId: string;
  email: string;
  rol: RolUsuario;
}

/** Payload que firmamos dentro del JWT. */
export interface PayloadJwt {
  sub: string;
  tenantId: string;
  email: string;
  rol: RolUsuario;
}
