-- AlterTable
ALTER TABLE "sesiones_de_compra" ADD COLUMN "codigo_egreso" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_de_compra_codigo_egreso_key" ON "sesiones_de_compra"("codigo_egreso");
