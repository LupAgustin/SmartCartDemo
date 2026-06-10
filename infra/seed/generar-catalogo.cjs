/**
 * Generador del catálogo demo (infra/seed/catalogo-demo.csv).
 *
 * Se corre UNA vez para producir el CSV que queda commiteado:
 *   node infra/seed/generar-catalogo.cjs
 *
 * Genera EAN-13 con prefijo 779 (GS1 Argentina) y dígito verificador
 * válido, así el flujo de escaneo se puede probar con códigos reales
 * en estructura. Precios en centavos de ARS.
 */
const fs = require('fs');
const path = require('path');

/** Calcula el dígito verificador EAN-13 de los primeros 12 dígitos. */
function digitoVerificadorEan13(doceDigitos) {
  const suma = doceDigitos
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return String((10 - (suma % 10)) % 10);
}

/** Arma un EAN-13 argentino: 779 + 9 dígitos + verificador. */
function eanArgentino(numero) {
  const cuerpo = `779${String(numero).padStart(9, '0')}`;
  return cuerpo + digitoVerificadorEan13(cuerpo);
}

// 50 productos típicos de súper argentino. Precios en pesos (se convierten a centavos).
const productos = [
  ['Yerba Mate Tradicional 1kg', 'Playadito', 6800],
  ['Yerba Mate Suave 500g', 'Taragüi', 3900],
  ['Leche Entera Sachet 1L', 'La Serenísima', 1850],
  ['Leche Descremada Larga Vida 1L', 'Sancor', 1950],
  ['Yogur Bebible Frutilla 900g', 'Yogurísimo', 2700],
  ['Queso Cremoso x kg', 'La Paulina', 11500],
  ['Queso Rallado 120g', 'Sancor', 3200],
  ['Manteca 200g', 'La Serenísima', 2900],
  ['Dulce de Leche Clásico 400g', 'San Ignacio', 3100],
  ['Pan Lactal Blanco 460g', 'Bimbo', 3400],
  ['Galletitas Dulces 300g', 'Bagley Opera', 2200],
  ['Galletitas de Agua 300g', 'Criollitas', 1900],
  ['Alfajor Triple', 'Guaymallén', 700],
  ['Bizcochos de Grasa 200g', 'Don Satur', 1600],
  ['Fideos Spaghetti 500g', 'Matarazzo', 1750],
  ['Fideos Mostachol 500g', 'Lucchetti', 1650],
  ['Arroz Largo Fino 1kg', 'Gallo', 2400],
  ['Polenta Instantánea 500g', 'Prestopronta', 1500],
  ['Harina de Trigo 000 1kg', 'Pureza', 1300],
  ['Harina Leudante 1kg', 'Blancaflor', 1550],
  ['Aceite de Girasol 1.5L', 'Natura', 4200],
  ['Aceite de Oliva Extra Virgen 500ml', 'Cocinero', 8900],
  ['Azúcar Común Tipo A 1kg', 'Ledesma', 1700],
  ['Sal Fina 500g', 'Celusal', 950],
  ['Mayonesa 475g', 'Hellmanns', 3300],
  ['Ketchup 500g', 'Hellmanns', 3100],
  ['Salsa de Tomate Triturado 520g', 'Arcor', 1450],
  ['Arvejas en Lata 350g', 'Noel', 1350],
  ['Atún en Aceite 170g', 'Gomes da Costa', 3600],
  ['Caballa en Lata 380g', 'La Campagnola', 4800],
  ['Gaseosa Cola 2.25L', 'Coca-Cola', 4100],
  ['Gaseosa Lima-Limón 2.25L', 'Sprite', 3800],
  ['Agua Mineral sin Gas 2L', 'Villavicencio', 1900],
  ['Soda en Sifón 1.5L', 'Ivess', 1600],
  ['Jugo en Polvo Naranja 18g', 'Tang', 450],
  ['Cerveza Rubia Lata 473ml', 'Quilmes', 2300],
  ['Vino Tinto Malbec 750ml', 'Toro', 3500],
  ['Fernet 750ml', 'Branca', 12900],
  ['Café Instantáneo 170g', 'Nescafé Dolca', 7800],
  ['Té en Saquitos x50', 'Green Hills', 2500],
  ['Mate Cocido x50 Saquitos', 'Cruz de Malta', 2800],
  ['Detergente Lavavajillas 750ml', 'Magistral', 3200],
  ['Lavandina 1L', 'Ayudín', 1400],
  ['Limpiador Líquido Pisos 900ml', 'Procenex', 2600],
  ['Jabón en Polvo 800g', 'Skip', 5400],
  ['Suavizante para Ropa 900ml', 'Comfort', 3700],
  ['Papel Higiénico x4 80m', 'Higienol', 4300],
  ['Rollo de Cocina x3', 'Sussex', 3900],
  ['Shampoo 400ml', 'Sedal', 4600],
  ['Jabón de Tocador x3 125g', 'Lux', 3300],
];

// Productos con su EAN REAL (leído del envase), para poder escanear
// el paquete físico en las demos. [ean, nombre, marca, precioPesos]
const productosConEanReal = [
  ['7790040143234', 'Galletitas Chocolinas 250g', 'Bagley', 2000],
];

const filas = [['ean', 'nombre', 'marca', 'precio_centavos', 'activo']];
productos.forEach(([nombre, marca, precioPesos], i) => {
  filas.push([eanArgentino(i + 1), nombre, marca, String(precioPesos * 100), 'true']);
});
productosConEanReal.forEach(([ean, nombre, marca, precioPesos]) => {
  filas.push([ean, nombre, marca, String(precioPesos * 100), 'true']);
});

const csv = filas.map((f) => f.join(',')).join('\n') + '\n';
const destino = path.join(__dirname, 'catalogo-demo.csv');
fs.writeFileSync(destino, csv, 'utf8');
console.log(
  `Catálogo demo generado: ${destino} (${productos.length + productosConEanReal.length} productos)`,
);
