/**
 * Genera codigos-barras.html: una página con los EAN-13 del catálogo
 * demo renderizados como códigos de barras escaneables (para probar el
 * escáner de la app apuntando a la pantalla o a una impresión).
 *
 * Uso: node infra/seed/generar-pagina-codigos.cjs
 * Requiere internet al abrir la página (JsBarcode desde CDN).
 */
const fs = require('fs');
const path = require('path');

const rutaCsv = path.resolve(__dirname, 'catalogo-demo.csv');
const rutaSalida = path.resolve(__dirname, 'codigos-barras.html');

const [, ...filas] = fs.readFileSync(rutaCsv, 'utf8').trim().split(/\r?\n/);
const productos = filas.map((fila) => {
  const [ean, nombre, marca, precioCentavos] = fila.split(',');
  return { ean, nombre, marca, precio: Number(precioCentavos) / 100 };
});

const tarjetas = productos
  .map(
    (p) => `      <div class="tarjeta">
        <div class="nombre">${p.nombre}</div>
        <div class="detalle">${p.marca} · $${p.precio.toLocaleString('es-AR')}</div>
        <svg class="codigo" data-ean="${p.ean}"></svg>
      </div>`,
  )
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>SmartCart — Catálogo demo escaneable</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f6f7f4; margin: 24px; }
    h1 { font-size: 20px; }
    p.ayuda { color: #555; max-width: 640px; }
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .tarjeta { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; text-align: center; }
    .nombre { font-weight: 700; font-size: 14px; }
    .detalle { color: #666; font-size: 12px; margin-bottom: 6px; }
    svg { width: 100%; }
  </style>
</head>
<body>
  <h1>🛒 SmartCart — Catálogo demo escaneable (${productos.length} productos)</h1>
  <p class="ayuda">Abrí esta página en el monitor (o imprimila), subí un poco el brillo
  y apuntá la cámara de la app a un código. Si el reflejo molesta, inclina apenas el teléfono.</p>
  <div class="grilla">
${tarjetas}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.1/dist/JsBarcode.all.min.js"></script>
  <script>
    document.querySelectorAll('svg.codigo').forEach((svg) => {
      JsBarcode(svg, svg.dataset.ean, { format: 'EAN13', height: 70, fontSize: 16, margin: 6 });
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(rutaSalida, html, 'utf8');
console.log(`Generado: ${rutaSalida} (${productos.length} códigos)`);
