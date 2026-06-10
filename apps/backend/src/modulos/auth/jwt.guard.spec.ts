import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { RolUsuario } from '@prisma/client';
import { PayloadJwt } from './auth.tipos';
import { JwtGuard } from './jwt.guard';

const payloadValido: PayloadJwt = {
  sub: 'usuario-1',
  tenantId: 'tenant-a',
  email: 'cliente@demo.com.ar',
  rol: RolUsuario.CLIENTE,
};

/** Arma un ExecutionContext mínimo con el header Authorization dado. */
function contextoCon(authorization?: string): { contexto: ExecutionContext; request: any } {
  const request: any = { headers: { authorization } };
  const contexto = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { contexto, request };
}

describe('JwtGuard (guard global de auth)', () => {
  let jwt: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: JwtGuard;

  beforeEach(() => {
    jwt = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    guard = new JwtGuard(jwt as unknown as JwtService, reflector as unknown as Reflector);
  });

  it('deja pasar rutas @Publico() sin mirar el token', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true); // ES_PUBLICO
    const { contexto } = contextoCon(undefined);
    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('rechaza con 401 si falta el token', async () => {
    const { contexto } = contextoCon(undefined);
    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza con 401 si el header no es Bearer', async () => {
    const { contexto } = contextoCon('Basic abc123');
    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza con 401 si el token es inválido o está vencido', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const { contexto } = contextoCon('Bearer token-vencido');
    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('con token válido cuelga el usuario (con tenantId del token firmado) en el request', async () => {
    jwt.verifyAsync.mockResolvedValue(payloadValido);
    const { contexto, request } = contextoCon('Bearer token-valido');
    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(request.usuario).toEqual({
      id: 'usuario-1',
      tenantId: 'tenant-a',
      email: 'cliente@demo.com.ar',
      rol: RolUsuario.CLIENTE,
    });
  });

  it('rechaza con 403 si la ruta exige un rol que el usuario no tiene', async () => {
    jwt.verifyAsync.mockResolvedValue(payloadValido); // rol CLIENTE
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined) // ES_PUBLICO
      .mockReturnValueOnce([RolUsuario.ADMIN_TENANT]); // ROLES_REQUERIDOS
    const { contexto } = contextoCon('Bearer token-valido');
    await expect(guard.canActivate(contexto)).rejects.toThrow(ForbiddenException);
  });

  it('acepta si el rol del usuario está entre los requeridos', async () => {
    jwt.verifyAsync.mockResolvedValue({ ...payloadValido, rol: RolUsuario.ADMIN_TENANT });
    reflector.getAllAndOverride
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce([RolUsuario.ADMIN_TENANT, RolUsuario.ADMIN_PLATAFORMA]);
    const { contexto } = contextoCon('Bearer token-valido');
    await expect(guard.canActivate(contexto)).resolves.toBe(true);
  });
});
