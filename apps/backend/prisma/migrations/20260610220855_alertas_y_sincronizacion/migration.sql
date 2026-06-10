-- CreateTable
CREATE TABLE "alertas_catalogo" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "ean" TEXT NOT NULL,
    "contador" INTEGER NOT NULL DEFAULT 1,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alertas_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_sincronizacion" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "altas" INTEGER NOT NULL,
    "bajas" INTEGER NOT NULL,
    "cambios_de_precio" INTEGER NOT NULL,
    "sin_cambios" INTEGER NOT NULL,
    "errores" TEXT[],
    "duracion_ms" INTEGER NOT NULL,
    "corrida_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_sincronizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alertas_catalogo_tenant_id_resuelta_idx" ON "alertas_catalogo"("tenant_id", "resuelta");

-- CreateIndex
CREATE UNIQUE INDEX "alertas_catalogo_tenant_id_ean_key" ON "alertas_catalogo"("tenant_id", "ean");

-- CreateIndex
CREATE INDEX "registros_sincronizacion_tenant_id_corrida_en_idx" ON "registros_sincronizacion"("tenant_id", "corrida_en");
