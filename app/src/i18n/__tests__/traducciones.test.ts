/// <reference types="jest" />
/*
 * Textos sin traducir (lógica), para TODAS las claves (generaliza la prueba de aprender.*):
 * - es.json y en.json tienen las mismas claves (también los sufijos de plural, porque es y en usan
 *   las mismas formas _one/_other);
 * - cada clave tiene las mismas variables {{…}} en los dos idiomas;
 * - ningún valor vacío, ni que no sea texto;
 * - ningún valor en inglés idéntico al español salvo nombres propios / símbolos (lista corta);
 * - toda clave literal usada en el código existe en es.json.
 */
declare const __dirname: string;
type Entrada = { name: string; isDirectory(): boolean };
const fs = require('fs') as {
  readdirSync(dir: string, o: { withFileTypes: true }): Entrada[];
  readFileSync(f: string, enc: 'utf8'): string;
};
const path = require('path') as { resolve(...p: string[]): string; join(...p: string[]): string; relative(a: string, b: string): string };

import en from '../locales/en.json';
import es from '../locales/es.json';

type Arbol = { [k: string]: unknown };

function plano(o: Arbol, p = ''): [string, unknown][] {
  return Object.entries(o).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' && !Array.isArray(v) ? plano(v as Arbol, `${p}${k}.`) : [[`${p}${k}`, v]],
  );
}

const ES = Object.fromEntries(plano(es as Arbol));
const EN = Object.fromEntries(plano(en as Arbol));
const PLURAL = /_(zero|one|two|few|many|other)$/;
const base = (k: string) => k.replace(PLURAL, '');
const vars = (s: string) => [...new Set([...s.matchAll(/\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g)].map((m) => m[1]))].sort();

test('hay textos que revisar', () => {
  expect(Object.keys(ES).length).toBeGreaterThan(100);
});

describe('es.json y en.json', () => {
  test('mismas claves exactas', () => {
    const soloES = Object.keys(ES).filter((k) => !(k in EN));
    const soloEN = Object.keys(EN).filter((k) => !(k in ES));
    expect({ soloES, soloEN }).toEqual({ soloES: [], soloEN: [] });
  });

  test('todos los valores son texto no vacío', () => {
    const malos = [
      ...Object.entries(ES).map(([k, v]) => ['es', k, v] as const),
      ...Object.entries(EN).map(([k, v]) => ['en', k, v] as const),
    ].filter(([, , v]) => typeof v !== 'string' || v.trim().length === 0);
    expect(malos).toEqual([]);
  });

  test('mismas variables {{…}} en cada clave', () => {
    const distintas: string[] = [];
    for (const k of Object.keys(ES)) {
      if (!(k in EN)) continue;
      const a = vars(String(ES[k]));
      const b = vars(String(EN[k]));
      if (a.join() !== b.join()) distintas.push(`${k}: es {${a}} / en {${b}}`);
    }
    expect(distintas).toEqual([]);
  });

  test('plurales: cada clave con formas de plural tiene _other en los dos idiomas', () => {
    const bases = [...new Set(Object.keys(ES).filter((k) => PLURAL.test(k)).map(base))];
    for (const b of bases) {
      for (const [n, loc] of [
        ['es', ES],
        ['en', EN],
      ] as const) {
        expect([n, b, `${b}_other` in loc]).toEqual([n, b, true]);
      }
    }
  });

  test('ninguna variable mal escrita ({ x }, {{x}, {x}})', () => {
    const malos = [...Object.entries(ES), ...Object.entries(EN)]
      .map(([k, v]) => [k, String(v)] as const)
      .filter(([, v]) => {
        const sinBuenas = v.replace(/\{\{\s*[\w.]+\s*(?:,[^}]*)?\}\}/g, '');
        return /[{}]/.test(sinBuenas);
      });
    expect(malos).toEqual([]);
  });

  test('textos en inglés idénticos al español: solo los aceptados (nombres propios, letras)', () => {
    // Se ignoran variables, números y signos. Si una clave nueva aparece aquí, probablemente quedó
    // sin traducir; si es legítima (igual en los dos idiomas), sumarla a la lista.
    const ACEPTADAS = ['app.nombre', 'aprender.letrasOpciones', 'novenas.canal', 'pestanas.novenas'];
    const letras = (v: string) => v.replace(/\{\{[^}]*\}\}/g, '').replace(/[^\p{L}]/gu, '');
    const iguales = Object.keys(ES)
      .filter((k) => k in EN && ES[k] === EN[k] && letras(String(ES[k])).length > 1)
      .sort();
    expect(iguales).toEqual(ACEPTADAS);
  });
});

// -------------------------------------------------------------------------------------------------

const SRC = path.resolve(__dirname, '..', '..');

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : archivos(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

describe('claves usadas en el código', () => {
  const RAICES = Object.keys(es).join('|');
  const LITERAL = new RegExp(`['"\`]((?:${RAICES})\\.[A-Za-z0-9_.]+)['"\`]`, 'g');
  const conocidas = new Set([...Object.keys(ES), ...Object.keys(ES).map(base)]);
  const prefijos = new Set(
    Object.keys(ES).flatMap((k) => k.split('.').slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join('.'))),
  );

  test('toda clave literal (ns.clave) existe en es.json', () => {
    const faltan: string[] = [];
    for (const f of archivos(SRC)) {
      const c = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
      for (const m of c.matchAll(LITERAL)) {
        const k = m[1].replace(/\.$/, '');
        // Un prefijo ('aprender.rasgos') que luego se completa en el código no es una clave.
        if (!conocidas.has(k) && !prefijos.has(k)) faltan.push(`${path.relative(SRC, f).replace(/\\/g, '/')}: ${k}`);
      }
    }
    expect(faltan).toEqual([]);
  });
});
