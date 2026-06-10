import { BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Valida el cuerpo/params de un request con un esquema Zod.
 * Si falla, responde 400 con el detalle de cada campo inválido.
 */
export function validar<T>(esquema: ZodSchema<T>, datos: unknown): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const detalles = resultado.error.issues.map(
      (p) => `${p.path.join('.') || 'cuerpo'}: ${p.message}`,
    );
    throw new BadRequestException({
      mensaje: 'Datos inválidos',
      detalles,
    });
  }
  return resultado.data;
}
