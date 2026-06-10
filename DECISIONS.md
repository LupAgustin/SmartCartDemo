# Registro de decisiones técnicas — SmartCart

Cada decisión nueva se agrega acá con fecha, contexto y alternativas descartadas.

## 2026-06-10 — Decisiones de arquitectura cerradas (vienen del brief, no cambiar sin avisar)

- **Móvil:** React Native + Expo (iOS y Android desde un código). Escaneo EAN-13/UPC.
- **Backend:** monolito modular NestJS con límites limpios por módulo (auth, tenants, sucursales, catálogo, sesión de compra, pagos, validación de egreso, métricas) para poder separar a futuro sin reescribir.
- **Multi-tenant:** aislamiento por `tenant_id` a nivel de fila en todas las entidades de negocio. Toda query filtra por tenant.
- **Base de datos:** PostgreSQL.
- **Catálogo:** cache propio en la base, sincronizado por job a través de un adaptador de fuente con interfaz común. MVP: CSV/SFTP. REST y webhook: solo firmas.
- **Pagos:** Mercado Pago sandbox detrás de la interfaz `ProveedorDePago` (PaymentProvider). Sin hardcodear el proveedor en la lógica de negocio. El pago exige conexión (no se encola offline).
- **Panel B2B:** React + Vite contra el mismo backend. Dashboards complejos: Metabase en Fase 2.

## 2026-06-10 — Monorepo con npm workspaces + Turborepo

**Decisión:** un solo repo con `apps/` (backend, movil, panel) y `packages/compartido` (tipos y contratos), orquestado con npm workspaces + Turborepo.
**Por qué:** npm ya está instalado (v11) y evita fricción extra en Windows; Turborepo da cache y orquestación de build/test/lint. `compartido` evita duplicar DTOs entre las tres apps.
**Descartado:** pnpm (una herramienta más para el equipo), repos separados (overhead de versionado de contratos para un MVP).

## 2026-06-10 — ORM: Prisma

**Decisión:** Prisma como ORM del backend.
**Por qué:** tipado fuerte generado desde el esquema, migraciones declarativas, excelente DX en TypeScript, seed integrado.
**Descartado:** TypeORM (decoradores más frágiles, migraciones más manuales).

## 2026-06-10 — Estrategia de aislamiento multi-tenant

**Decisión:** `tenant_id` en toda entidad de negocio + helper obligatorio `conTenant()` (`apps/backend/src/comun/tenant/`) que mezcla el filtro de tenant en cada `where` de Prisma, lanza error si falta el tenant y pisa cualquier `tenantId` inyectado en el filtro (anti-spoofing). Con tests unitarios desde Sprint 0.
**Por qué:** simple, auditable y suficiente para el MVP; el contexto de auth (JWT, Sprint 1) será la única fuente del tenant.
**Fase 2 si hace falta:** Row Level Security de Postgres como segunda capa de defensa.

## 2026-06-10 — Montos en centavos (enteros)

**Decisión:** todos los montos se persisten y transportan en **centavos de ARS** como enteros (`precio_actual_centavos`, `snapshot_precio_centavos`, `monto_centavos`).
**Por qué:** elimina errores de punto flotante en sumas de carrito y conciliación de pagos.

## 2026-06-10 — Configuración validada con Zod

**Decisión:** las variables de entorno del backend se validan con Zod al arrancar (`src/config/entorno.ts`); el proceso falla rápido con mensaje claro si falta algo.
**Descartado:** `@nestjs/config` con Joi (más dependencia para lo mismo).

## 2026-06-10 — Observabilidad desde el día uno

**Decisión:** Sentry en backend (y en móvil desde Sprint 2) inicializado solo si hay DSN, para no estorbar en dev. Analytics detrás de la abstracción `ServicioAnalytics` (no-op en MVP; PostHog en Fase 2). Push con Firebase se integra cuando haya un flujo que notifique (Sprint 3+).

## 2026-06-10 — Deploy de staging diferido

**Decisión:** CI (lint/typecheck/test/build) desde Sprint 0 con GitHub Actions; el deploy continuo a staging queda pendiente hasta definir hosting (candidatos: Railway/Render para el backend + Neon/RDS para Postgres). No bloquea los sprints 1-3.

## 2026-06-10 — Turborepo en envMode "loose"

**Decisión:** `envMode: "loose"` en `turbo.json`.
**Por qué:** el modo estricto (default de Turbo 2) filtra variables de entorno que npm/cmd necesitan en Windows (ej. `APPDATA`), haciendo que cualquier script falle con exit 1 sin output. Verificado empíricamente en esta máquina (Windows 11, npm 11).
**Costo asumido:** el cache de Turbo es algo menos hermético respecto de variables de entorno; aceptable para el MVP.

## 2026-06-10 — Seed con EAN-13 estructuralmente válidos

**Decisión:** el catálogo demo (50 productos) usa EAN-13 con prefijo 779 (GS1 Argentina) y dígito verificador calculado (`infra/seed/generar-catalogo.cjs`), para que el escáner real los acepte en pruebas físicas (se pueden renderizar como código de barras y escanear).
