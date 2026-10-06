#!/usr/bin/env node
/**
 * Valida los textos de la ficha de Google Play en docs/tienda/<idioma>/ficha.md.
 *
 * Lee los tres bloques de código (título, descripción breve, descripción completa), en ese orden,
 * y revisa los límites de Play (https://support.google.com/googleplay/android-developer/answer/9898842):
 * título ≤ 30, breve ≤ 80, completa ≤ 4000 caracteres. Revisa también lo que esa política prohíbe
 * y lo que pide docs/tienda/README.md (sin emojis, sin rankings ni superlativos, sin "gratis" en el título).
 *
 * Uso: node scripts/validar-tienda.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = join(raiz, 'docs', 'tienda');

const LIMITES = [
  ['título', 30],
  ['descripción breve', 80],
  ['descripción completa', 4000],
];

/** Palabras que la política de metadatos o docs/tienda/README.md no permiten. */
const PROHIBIDAS = [
  /#\s?1\b/i,
  /\b(mejor|best|top|n[uú]mero uno|number one|app del año|app of the year)\b/i,
  /\b(cura|sana tu|heals?|cures?|garantiza|guaranteed?)\b/i,
];
const EMOJI = /\p{Extended_Pictographic}/u;

let errores = 0;
const error = (m) => {
  errores++;
  console.error(`✗ ${m}`);
};

const idiomas = readdirSync(carpeta).filter((d) => statSync(join(carpeta, d)).isDirectory());
if (idiomas.length === 0) error('No hay carpetas de idioma en docs/tienda/.');

for (const idioma of idiomas) {
  const texto = readFileSync(join(carpeta, idioma, 'ficha.md'), 'utf8').replace(/\r\n/g, '\n');
  const bloques = [...texto.matchAll(/```\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  if (bloques.length !== 3) {
    error(`${idioma}: se esperaban 3 bloques (título, breve, completa) y hay ${bloques.length}.`);
    continue;
  }
  bloques.forEach((b, i) => {
    const [nombre, max] = LIMITES[i];
    const n = [...b].length; // por punto de código, como cuenta Play
    const estado = n <= max ? '✓' : '✗';
    console.log(`${estado} ${idioma} · ${nombre}: ${n}/${max}`);
    if (n > max) error(`${idioma}: ${nombre} supera ${max} caracteres (${n}).`);
    if (EMOJI.test(b)) error(`${idioma}: ${nombre} tiene emojis.`);
    for (const re of PROHIBIDAS) if (re.test(b)) error(`${idioma}: ${nombre} contiene "${b.match(re)[0]}".`);
  });
  const titulo = bloques[0];
  if (/\b(gratis|free|bible|biblia)\b/i.test(titulo)) error(`${idioma}: el título no lleva "gratis", "free" ni "Bible".`);
  if (titulo === titulo.toUpperCase()) error(`${idioma}: el título está en mayúsculas.`);
}

if (errores) {
  console.error(`\n${errores} error(es).`);
  process.exit(1);
}
console.log('\nFicha de la tienda: sin errores.');
