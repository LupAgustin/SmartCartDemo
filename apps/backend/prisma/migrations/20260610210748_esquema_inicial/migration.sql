-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('CLIENTE', 'OPERADOR_EGRESO', 'ADMIN_TENANT', 'ADMIN_PLATAFORMA');

-- CreateEnum
CREATE TYPE "EstadoSesion" AS ENUM ('ACTIVA', 'PENDIENTE_PAGO', 'PAGADA', 'VALIDADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "ResultadoValidacion" AS ENUM ('APROBADA', 'CON_DIFERENCIAS', 'RECHAZADA');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sucursales" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "radio_geofence_metros" INTEGER NOT NULL DEFAULT 50,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "hash_contrasena" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'CLIENTE',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_catalogo" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ean" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT,
    "precio_actual_centavos" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_de_compra" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "estado" "EstadoSesion" NOT NULL DEFAULT 'ACTIVA',
    "iniciada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizada_en" TIMESTAMP(3),

    CONSTRAINT "sesiones_de_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_de_escaneo" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sesion_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "ean" TEXT NOT NULL,
    "nombre_producto" TEXT NOT NULL,
    "snapshot_precio_centavos" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "escaneado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_de_escaneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacciones_de_pago" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sesion_id" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "monto_centavos" INTEGER NOT NULL,
    "referencia_externa" TEXT,
    "payload_webhook" JSONB,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transacciones_de_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validaciones_de_egreso" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sesion_id" TEXT NOT NULL,
    "operador_id" TEXT NOT NULL,
    "resultado" "ResultadoValidacion" NOT NULL,
    "observaciones" TEXT,
    "validada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validaciones_de_egreso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "sucursales_tenant_id_idx" ON "sucursales"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tenant_id_email_key" ON "usuarios"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "productos_catalogo_tenant_id_activo_idx" ON "productos_catalogo"("tenant_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "productos_catalogo_tenant_id_ean_key" ON "productos_catalogo"("tenant_id", "ean");

-- CreateIndex
CREATE INDEX "sesiones_de_compra_tenant_id_estado_idx" ON "sesiones_de_compra"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "sesiones_de_compra_tenant_id_usuario_id_idx" ON "sesiones_de_compra"("tenant_id", "usuario_id");

-- CreateIndex
CREATE INDEX "eventos_de_escaneo_tenant_id_sesion_id_idx" ON "eventos_de_escaneo"("tenant_id", "sesion_id");

-- CreateIndex
CREATE UNIQUE INDEX "transacciones_de_pago_sesion_id_key" ON "transacciones_de_pago"("sesion_id");

-- CreateIndex
CREATE INDEX "transacciones_de_pago_tenant_id_estado_idx" ON "transacciones_de_pago"("tenant_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "validaciones_de_egreso_sesion_id_key" ON "validaciones_de_egreso"("sesion_id");

-- CreateIndex
CREATE INDEX "validaciones_de_egreso_tenant_id_idx" ON "validaciones_de_egreso"("tenant_id");

-- AddForeignKey
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_catalogo" ADD CONSTRAINT "productos_catalogo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_de_compra" ADD CONSTRAINT "sesiones_de_compra_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_de_compra" ADD CONSTRAINT "sesiones_de_compra_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_de_compra" ADD CONSTRAINT "sesiones_de_compra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_de_escaneo" ADD CONSTRAINT "eventos_de_escaneo_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesiones_de_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_de_escaneo" ADD CONSTRAINT "eventos_de_escaneo_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones_de_pago" ADD CONSTRAINT "transacciones_de_pago_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones_de_pago" ADD CONSTRAINT "transacciones_de_pago_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesiones_de_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones_de_egreso" ADD CONSTRAINT "validaciones_de_egreso_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones_de_egreso" ADD CONSTRAINT "validaciones_de_egreso_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesiones_de_compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones_de_egreso" ADD CONSTRAINT "validaciones_de_egreso_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
