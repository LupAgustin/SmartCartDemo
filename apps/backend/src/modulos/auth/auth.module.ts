import { Module } from '@nestjs/common';

/**
 * Módulo de autenticación y autorización.
 * Sprint 1: registro/login de usuario final con JWT (tenant_id en el token),
 * guard global que inyecta el contexto de tenant en cada request.
 */
@Module({})
export class AuthModule {}
