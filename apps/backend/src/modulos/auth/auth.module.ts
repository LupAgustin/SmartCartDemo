import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { cargarEntorno } from '../../config/entorno';
import { AuthController } from './auth.controller';
import { AuthServicio } from './auth.servicio';
import { JwtGuard } from './jwt.guard';

/**
 * Módulo de autenticación y autorización.
 * Registra el guard JWT como guard GLOBAL: toda ruta exige token salvo
 * que esté marcada con @Publico(). El tenantId de cada request sale
 * siempre del token firmado (base del aislamiento multi-tenant).
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: cargarEntorno().JWT_SECRETO,
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthServicio, { provide: APP_GUARD, useClass: JwtGuard }],
  exports: [AuthServicio],
})
export class AuthModule {}
