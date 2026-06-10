import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RolUsuario, Usuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaServicio } from '../../prisma/prisma.servicio';
import { PayloadJwt } from './auth.tipos';

/** Rondas de bcrypt: 10 equilibra seguridad y latencia de login en el MVP. */
const RONDAS_BCRYPT = 10;

export interface RespuestaAuth {
  token: string;
  usuario: {
    id: string;
    tenantId: string;
    email: string;
    nombre: string;
    rol: RolUsuario;
  };
}

@Injectable()
export class AuthServicio {
  constructor(
    private readonly prisma: PrismaServicio,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Registro de usuario final (rol CLIENTE) dentro de un tenant.
   * El tenant se identifica por slug porque en el registro todavía
   * no hay token del cual sacarlo.
   */
  async registrar(datos: {
    tenantSlug: string;
    email: string;
    nombre: string;
    contrasena: string;
  }): Promise<RespuestaAuth> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: datos.tenantSlug },
    });
    if (!tenant || !tenant.activo) {
      throw new UnauthorizedException('Supermercado inexistente o inactivo');
    }

    const existente = await this.prisma.usuario.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: datos.email } },
    });
    if (existente) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const usuario = await this.prisma.usuario.create({
      data: {
        tenantId: tenant.id,
        email: datos.email,
        nombre: datos.nombre,
        hashContrasena: await bcrypt.hash(datos.contrasena, RONDAS_BCRYPT),
        rol: RolUsuario.CLIENTE,
      },
    });
    return this.armarRespuesta(usuario);
  }

  /** Login por tenant + email + contraseña. */
  async ingresar(datos: {
    tenantSlug: string;
    email: string;
    contrasena: string;
  }): Promise<RespuestaAuth> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: datos.tenantSlug },
    });
    if (!tenant || !tenant.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: datos.email } },
    });
    // Mensaje genérico a propósito: no revelar si el email existe.
    if (!usuario || !(await bcrypt.compare(datos.contrasena, usuario.hashContrasena))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.armarRespuesta(usuario);
  }

  private async armarRespuesta(usuario: Usuario): Promise<RespuestaAuth> {
    const payload: PayloadJwt = {
      sub: usuario.id,
      tenantId: usuario.tenantId,
      email: usuario.email,
      rol: usuario.rol,
    };
    return {
      token: await this.jwt.signAsync(payload),
      usuario: {
        id: usuario.id,
        tenantId: usuario.tenantId,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    };
  }
}
