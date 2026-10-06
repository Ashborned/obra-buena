#!/usr/bin/env node
/**
 * Genera todos los íconos y la pantalla de carga de Soul Shelter desde la fuente SVG de assets/marca/.
 *
 * Fuente (dibujo propio, editar a mano): fondo.svg, simbolo.svg, simbolo-mono.svg.
 * Generados (no editar a mano): assets/marca/icono.svg, assets/marca/grafico-destacado.svg y los PNG
 * de la lista SALIDAS. Es idempotente: correrlo dos veces deja los mismos archivos.
 *
 * Al final verifica cada salida (dimensiones, canal alfa, peso y zona segura) y falla si algo no cumple.
 *
 * Uso (desde la raíz del repo): npm install && npm run marca
 * Herramientas: devDependencies de la raíz (@resvg/resvg-js, pngjs, opentype.js); no entran a la app.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';
import { PNG } from 'pngjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const marca = join(raiz, 'assets', 'marca');
const salidas = join(marca, 'salidas');
const imagenesApp = join(raiz, 'app', 'assets', 'images');

/** El símbolo vive en el círculo central de radio 313 de 1024 (zona segura 66/108 de Android). */
const RADIO_SEGURO = 313;
/** En el ícono completo (iOS, Play, favicon) el símbolo se agranda: ahí no hay máscara que lo recorte tanto. */
const ESCALA_ICONO = 1.18;
/** Fuente del nombre en el gráfico destacado (OFL, ya está en la app). */
const FUENTE_NOMBRE = join(
  raiz,
  'app/node_modules/@expo-google-fonts/cormorant-garamond/600SemiBold/CormorantGaramond_600SemiBold.ttf',
);
/** Texto del gráfico destacado: glowSoft (docs/sistema-diseno.md). */
const COLOR_NOMBRE = '#FFD3E4';

// ---------------------------------------------------------------------------------------------------
// Fuente SVG

const leer = (archivo) => readFileSync(join(marca, archivo), 'utf8');

/** Contenido interior de un SVG (sin la etiqueta raíz). */
function interior(svg) {
  const inicio = svg.indexOf('>', svg.indexOf('<svg')) + 1;
  const fin = svg.lastIndexOf('</svg>');
  if (inicio <= 0 || fin < 0) throw new Error('SVG sin etiqueta raíz');
  return svg.slice(inicio, fin).trim();
}

const envolver = (contenido, viewBox = '0 0 1024 1024', ancho = 1024, alto = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${ancho}" height="${alto}">\n` +
  `  <!-- Generado por scripts/generar-marca.mjs desde assets/marca/. No editar a mano. -->\n` +
  `  ${contenido}\n</svg>\n`;

const escalar = (contenido, s, cx = 512, cy = 512) =>
  `<g transform="translate(${cx} ${cy}) scale(${s}) translate(-512 -512)">${contenido}</g>`;

const fondo = interior(leer('fondo.svg'));
const simbolo = interior(leer('simbolo.svg'));
const simboloMono = interior(leer('simbolo-mono.svg'));

const iconoSvg = envolver(`${fondo}\n  ${escalar(simbolo, ESCALA_ICONO)}`);
/** Pantalla de carga: solo el símbolo, recortado a su círculo seguro (Android 12+ lo enmascara en círculo). */
const lado = RADIO_SEGURO * 2;
const cargaSvg = envolver(simbolo, `${512 - RADIO_SEGURO} ${512 - RADIO_SEGURO} ${lado} ${lado}`);

/** Gráfico destacado de Google Play: fondo de la marca, la vela y el nombre en Cormorant Garamond (paths). */
function graficoDestacado() {
  const nombre = JSON.parse(readFileSync(join(raiz, 'app', 'app.json'), 'utf8')).expo.name;
  const b = readFileSync(FUENTE_NOMBRE);
  const fuente = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const tam = 104;
  const caja = fuente.getPath(nombre, 0, 0, tam).getBoundingBox();
  const anchoTexto = caja.x2 - caja.x1;
  // Vela a la izquierda, nombre a la derecha; el conjunto, centrado.
  const escalaVela = 0.62;
  const anchoVela = 340 * escalaVela;
  const separacion = 40;
  const total = anchoVela + separacion + anchoTexto;
  const x0 = (1024 - total) / 2;
  const cxVela = x0 + anchoVela / 2;
  const xTexto = x0 + anchoVela + separacion - caja.x1;
  const yTexto = 250 - (caja.y1 + caja.y2) / 2;
  const trazo = fuente.getPath(nombre, xTexto, yTexto, tam).toPathData(2);
  // El fondo de 1024 se estira a 1024×500 (degradado vertical y halo bajo la vela).
  const contenido = [
    `<g transform="scale(1 ${500 / 1024})">${fondo.replaceAll('cx="512" cy="420"', `cx="${cxVela.toFixed(1)}" cy="420"`)}</g>`,
    escalar(simbolo, escalaVela, cxVela, 250 + (512 - 500) * escalaVela),
    `<path d="${trazo}" fill="${COLOR_NOMBRE}"/>`,
  ].join('\n  ');
  return envolver(contenido, '0 0 1024 500', 1024, 500);
}

// ---------------------------------------------------------------------------------------------------
// Salidas

/** alfa: 'no' = RGB sin canal alfa · 'si' = RGBA. zona: radio (fracción del lado) fuera del cual todo es transparente. */
const SALIDAS = [
  { ruta: join(imagenesApp, 'icon.png'), svg: iconoSvg, ancho: 1024, alto: 1024, alfa: 'no' },
  { ruta: join(imagenesApp, 'android-icon-background.png'), svg: envolver(fondo), ancho: 432, alto: 432, alfa: 'no' },
  {
    ruta: join(imagenesApp, 'android-icon-foreground.png'),
    svg: envolver(simbolo),
    ancho: 432,
    alto: 432,
    alfa: 'si',
    zona: RADIO_SEGURO / 1024,
  },
  {
    ruta: join(imagenesApp, 'android-icon-monochrome.png'),
    svg: envolver(simboloMono),
    ancho: 432,
    alto: 432,
    alfa: 'si',
    zona: RADIO_SEGURO / 1024,
  },
  { ruta: join(imagenesApp, 'favicon.png'), svg: iconoSvg, ancho: 48, alto: 48, alfa: 'no' },
  { ruta: join(imagenesApp, 'splash-icon.png'), svg: cargaSvg, ancho: 1024, alto: 1024, alfa: 'si', zona: 0.5 },
  { ruta: join(salidas, 'play-icono-512.png'), svg: iconoSvg, ancho: 512, alto: 512, alfa: 'si', maxKB: 1024 },
  {
    ruta: join(salidas, 'play-grafico-1024x500.png'),
    svg: graficoDestacado(),
    ancho: 1024,
    alto: 500,
    alfa: 'no',
    svgCopia: join(marca, 'grafico-destacado.svg'),
  },
];

function renderizar({ svg, ancho, alfa }) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: ancho }, font: { loadSystemFonts: false } })
    .render()
    .asPng();
  if (alfa === 'si') return png;
  // Sin canal alfa: se decodifica y se vuelve a escribir como RGB (tipo de color 2).
  const img = PNG.sync.read(png);
  return PNG.sync.write(img, { colorType: 2, inputHasAlpha: true });
}

/** Cabecera IHDR: ancho, alto y tipo de color (2 = RGB, 6 = RGBA). */
function cabecera(buf) {
  if (buf.readUInt32BE(12) !== 0x49484452) throw new Error('PNG sin IHDR');
  return { ancho: buf.readUInt32BE(16), alto: buf.readUInt32BE(20), tipoColor: buf[25] };
}

/** Píxeles con algo de opacidad fuera del círculo central de radio `zona` × lado. */
function fueraDeZona(buf, zona) {
  const img = PNG.sync.read(buf);
  const r = zona * img.width + 0.5;
  const c = img.width / 2;
  let fuera = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const a = img.data[(y * img.width + x) * 4 + 3];
      if (a > 0 && Math.hypot(x + 0.5 - c, y + 0.5 - c) > r) fuera++;
    }
  }
  return fuera;
}

mkdirSync(salidas, { recursive: true });
writeFileSync(join(marca, 'icono.svg'), iconoSvg);

const errores = [];
for (const s of SALIDAS) {
  mkdirSync(dirname(s.ruta), { recursive: true });
  writeFileSync(s.ruta, renderizar(s));
  if (s.svgCopia) writeFileSync(s.svgCopia, s.svg);

  const buf = readFileSync(s.ruta);
  const { ancho, alto, tipoColor } = cabecera(buf);
  const nombre = relative(raiz, s.ruta).replaceAll('\\', '/');
  const kb = statSync(s.ruta).size / 1024;
  const problemas = [];
  if (ancho !== s.ancho || alto !== s.alto) problemas.push(`mide ${ancho}×${alto}, se esperaba ${s.ancho}×${s.alto}`);
  if (s.alfa === 'no' && tipoColor !== 2) problemas.push(`tiene canal alfa (tipo de color ${tipoColor})`);
  if (s.alfa === 'si' && tipoColor !== 6) problemas.push(`no es RGBA de 32 bits (tipo de color ${tipoColor})`);
  if (s.maxKB && kb > s.maxKB) problemas.push(`pesa ${kb.toFixed(0)} KB (máximo ${s.maxKB})`);
  if (s.zona) {
    const n = fueraDeZona(buf, s.zona);
    if (n > 0) problemas.push(`${n} píxeles fuera de la zona segura`);
  }
  const alfaTxt = tipoColor === 2 ? 'RGB sin alfa' : 'RGBA';
  if (problemas.length) errores.push(`${nombre}: ${problemas.join('; ')}`);
  console.log(`${problemas.length ? 'FALLA' : 'ok   '} ${nombre}  ${ancho}×${alto}  ${alfaTxt}  ${kb.toFixed(1)} KB`);
}

if (errores.length) {
  console.error(`\n${errores.length} salida(s) no cumplen:\n- ${errores.join('\n- ')}`);
  process.exit(1);
}
console.log('\nMarca generada y verificada.');
