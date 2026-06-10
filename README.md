# 🛒 SmartCart — MVP scan & go para supermercados

App móvil donde el cliente escanea productos mientras recorre el súper, arma un
carrito virtual con total en tiempo real y paga in-app (Mercado Pago) o con QR
en caja. Un operador valida el carro físico al egreso. B2B multi-tenant: cada
cadena de supermercados es un tenant aislado con su catálogo, precios y
sucursales.

## Estructura del monorepo

```
apps/
  backend/   → API NestJS (monolito modular, Prisma + PostgreSQL)
  movil/     → App Expo / React Native (cliente final)
  panel/     → Panel web React + Vite (B2B + interno)
packages/
  compartido/ → Tipos y contratos compartidos (DTOs, enums)
infra/
  docker-compose.yml → PostgreSQL local
  seed/      → Catálogo demo (50 productos, EAN-13 válidos)
```

Decisiones técnicas: ver [DECISIONS.md](DECISIONS.md).

## Prerequisitos

- Node.js ≥ 20 y npm ≥ 10
- Docker Desktop (para PostgreSQL local)
- (Móvil) App **Expo Go** en el teléfono, o un emulador Android/iOS

## Cómo correr todo localmente (Windows / PowerShell)

```powershell
# 1. Instalar dependencias de todo el monorepo
npm install

# 2. Levantar PostgreSQL
docker compose -f infra/docker-compose.yml up -d

# 3. Configurar el backend
Copy-Item apps/backend/.env.example apps/backend/.env

# 4. Crear el esquema y cargar datos demo (tenant, sucursal, usuarios, 50 productos)
npm run db:setup

# 5. Levantar el backend (puerto 3000)
npm run dev:backend
# Verificar: http://localhost:3000/salud → {"estado":"ok","baseDeDatos":"ok",...}

# 6. En otra terminal: panel web (puerto 5173)
npm run dev:panel

# 7. En otra terminal: app móvil (Expo)
npm run dev:movil
# Escanear el QR con Expo Go. En dispositivo físico, configurar
# EXPO_PUBLIC_API_URL en apps/movil/.env con la IP de tu máquina.
```

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run test` | Tests de todos los workspaces (Turborepo) |
| `npm run typecheck` | Chequeo de tipos de todo el monorepo |
| `npm run build` | Build de todos los workspaces |
| `npm run db:migrar` | Aplica migraciones de Prisma (dev) |
| `npm run db:seed` | Re-ejecuta el seed (idempotente) |

## Datos de prueba (seed)

- **Tenant:** Súper Demo (`super-demo`)
- **Sucursal:** Cerro de las Rosas, Av. Rafael Núñez 4850, Córdoba (geofence 50m)
- **Usuarios:** `cliente@demo.com.ar`, `operador@superdemo.com.ar`, `admin@superdemo.com.ar` — contraseña demo de los tres: `SmartCart2026!` (solo seed de desarrollo)
- **Catálogo:** 50 productos típicos argentinos con EAN-13 estructuralmente válidos (prefijo 779). Regenerar con `node infra/seed/generar-catalogo.cjs`.

## Ambientes

- **dev:** local, con `docker-compose` y `.env` (este README).
- **staging:** variables preparadas en `.env.example`; hosting pendiente de definir (ver DECISIONS.md).

## Estado del proyecto

Sprint 0 (cimientos) ✔ · Sprint 1 (auth JWT, catálogo + importador CSV, sesión de compra con snapshot de precio) ✔ · Sprint 2 (app móvil: login, sucursales con geofence, escáner EAN, carrito con total en vivo y persistencia local) ✔ — siguiente: Sprint 3 (pago simulado + QR de egreso + vista del operador).
