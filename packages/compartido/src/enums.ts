/** Estados del ciclo de vida de una sesión de compra. */
export enum EstadoSesion {
  ACTIVA = 'ACTIVA',
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
  PAGADA = 'PAGADA',
  VALIDADA = 'VALIDADA',
  CANCELADA = 'CANCELADA',
}

/** Estados de una transacción de pago. */
export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  REEMBOLSADO = 'REEMBOLSADO',
}

/** Resultado de la validación humana al egreso. */
export enum ResultadoValidacion {
  APROBADA = 'APROBADA',
  CON_DIFERENCIAS = 'CON_DIFERENCIAS',
  RECHAZADA = 'RECHAZADA',
}

/** Roles de usuario dentro de un tenant. */
export enum RolUsuario {
  CLIENTE = 'CLIENTE',
  OPERADOR_EGRESO = 'OPERADOR_EGRESO',
  ADMIN_TENANT = 'ADMIN_TENANT',
  ADMIN_PLATAFORMA = 'ADMIN_PLATAFORMA',
}

/** Fuentes de catálogo soportadas por el adaptador de sincronización. */
export enum FuenteCatalogo {
  CSV_SFTP = 'CSV_SFTP',
  REST = 'REST',
  WEBHOOK = 'WEBHOOK',
}
