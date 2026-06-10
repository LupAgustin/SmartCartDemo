import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { validar } from '../../comun/validacion';
import { Publico } from './decoradores';
import { AuthServicio } from './auth.servicio';

const esquemaRegistro = z.object({
  tenantSlug: z.string().min(1, 'Falta el supermercado'),
  email: z.string().email('Email inválido'),
  nombre: z.string().min(2, 'El nombre es muy corto'),
  contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const esquemaLogin = z.object({
  tenantSlug: z.string().min(1, 'Falta el supermercado'),
  email: z.string().email('Email inválido'),
  contrasena: z.string().min(1, 'Falta la contraseña'),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthServicio) {}

  /** Registro de cliente final. Devuelve token + datos del usuario. */
  @Publico()
  @Post('registro')
  registrar(@Body() cuerpo: unknown) {
    return this.auth.registrar(validar(esquemaRegistro, cuerpo));
  }

  /** Login. Devuelve token + datos del usuario. */
  @Publico()
  @HttpCode(200)
  @Post('login')
  ingresar(@Body() cuerpo: unknown) {
    return this.auth.ingresar(validar(esquemaLogin, cuerpo));
  }
}
