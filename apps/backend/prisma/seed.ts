/**
 * Seed de desarrollo: 1 tenant de prueba, 1 sucursal en Córdoba,
 * 3 usuarios (cliente, operador de egreso, admin) y el catálogo demo
 * de ~50 productos desde infra/seed/catalogo-demo.csv.
 *
 * Idempotente: se puede correr varias veces sin duplicar datos (upserts).
 * Uso: npm run db:seed --workspace=@smartcart/backend
 */
import 'dotenv/config';
import { PrismaClient, RolUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/** Fila del CSV de catálogo (formato del adaptador CSV del MVP). */
interface FilaCatalogo {
  ean: string;
  nombre: string;
  marca: string;
  precioCentavos: number;
  activo: boolean;
}

function leerCatalogoCsv(): FilaCatalogo[] {
  const ruta = path.resolve(__dirname, '../../../infra/seed/catalogo-demo.csv');
  const contenido = fs.readFileSync(ruta, 'utf8').trim();
  const [, ...lineas] = contenido.split('\n'); // descarta el encabezado
  return lineas.map((linea) => {
    const [ean, nombre, marca, precioCentavos, activo] = linea.split(',');
    return {
      ean: ean.trim(),
      nombre: nombre.trim(),
      marca: marca.trim(),
      precioCentavos: Number(precioCentavos),
      activo: activo.trim() === 'true',
    };
  });
}

async function sembrar() {
  // --- Tenant de prueba ---
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'super-demo' },
    update: {},
    create: { nombre: 'Súper Demo', slug: 'super-demo' },
  });
  console.log(`Tenant: ${tenant.nombre} (${tenant.id})`);

  // --- Sucursal en Córdoba capital (coordenadas reales, barrio Cerro de las Rosas) ---
  const nombreSucursal = 'Sucursal Cerro de las Rosas';
  const sucursalExistente = await prisma.sucursal.findFirst({
    where: { tenantId: tenant.id, nombre: nombreSucursal },
  });
  const sucursal =
    sucursalExistente ??
    (await prisma.sucursal.create({
      data: {
        tenantId: tenant.id,
        nombre: nombreSucursal,
        direccion: 'Av. Rafael Núñez 4850, Córdoba, Argentina',
        latitud: -31.3681,
        longitud: -64.2352,
        radioGeofenceMetros: 50,
      },
    }));
  console.log(`Sucursal: ${sucursal.nombre}`);

  // --- Usuarios de prueba ---
  // Contraseña demo compartida (solo seed de desarrollo, documentada en el README).
  const contrasenaDemo = 'SmartCart2026!';
  const hashDemo = await bcrypt.hash(contrasenaDemo, 10);
  const usuarios: Array<{ email: string; nombre: string; rol: RolUsuario }> = [
    { email: 'cliente@demo.com.ar', nombre: 'Clara Cliente', rol: RolUsuario.CLIENTE },
    { email: 'operador@superdemo.com.ar', nombre: 'Oscar Operador', rol: RolUsuario.OPERADOR_EGRESO },
    { email: 'admin@superdemo.com.ar', nombre: 'Ana Admin', rol: RolUsuario.ADMIN_TENANT },
  ];
  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      update: { rol: u.rol, hashContrasena: hashDemo },
      create: { ...u, tenantId: tenant.id, hashContrasena: hashDemo },
    });
  }
  console.log(`Usuarios: ${usuarios.length} (cliente, operador, admin)`);

  // --- Catálogo demo desde CSV ---
  const filas = leerCatalogoCsv();
  for (const fila of filas) {
    await prisma.productoCatalogo.upsert({
      where: { tenantId_ean: { tenantId: tenant.id, ean: fila.ean } },
      update: { precioActualCentavos: fila.precioCentavos, activo: fila.activo },
      create: {
        tenantId: tenant.id,
        ean: fila.ean,
        nombre: fila.nombre,
        marca: fila.marca,
        precioActualCentavos: fila.precioCentavos,
        activo: fila.activo,
      },
    });
  }
  console.log(`Catálogo: ${filas.length} productos importados desde catalogo-demo.csv`);
}

sembrar()
  .then(() => console.log('Seed completado ✔'))
  .catch((error) => {
    console.error('Error en el seed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
