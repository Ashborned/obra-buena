/// <reference types="jest" />
/*
 * Principio 1 (CLAUDE.md) en TODO app/src: la oración no se premia y el juego de Aprender es de
 * conocimiento, sin temporizadores ni cuentas regresivas, sin rachas ni contadores de días seguidos.
 * Además: las claves aprender.* existen en es y en con las mismas variables {{…}}.
 *
 * Se revisa el código sin comentarios (los comentarios dicen "sin rachas", lo que es correcto).
 */
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';

declare const __dirname: string;
const fs = require('fs') as {
  readFileSync(f: string, enc: 'utf8'): string;
  readdirSync(d: string, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
};
const path = require('path') as { resolve(...p: string[]): string; relative(a: string, b: string): string };

const SRC = path.resolve(__dirname, '..');

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.resolve(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : archivos(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

const sinComentarios = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const codigo = archivos(SRC).map((f) => ({
  archivo: path.relative(SRC, f).replace(/\\/g, '/'),
  texto: sinComentarios(fs.readFileSync(f, 'utf8')),
}));

const donde = (re: RegExp) => codigo.filter((c) => re.test(c.texto)).map((c) => c.archivo).sort();

/** Pantallas y componentes de Aprender. */
const APRENDER = [
  'app/(tabs)/aprender.tsx',
  'app/lectura/[id].tsx',
  'app/quiz/[id].tsx',
  'app/medalla/[id].tsx',
  'components/medalla.tsx',
  'components/icono-rasgo.tsx',
  'components/aviso-rasgo.tsx',
  'components/acunacion.tsx',
  'lib/aprender.ts',
  'lib/aprender-progreso.ts',
  'lib/progreso.ts',
];

describe('temporizadores', () => {
  test('se revisan todos los archivos de Aprender', () => {
    const lista = codigo.map((c) => c.archivo);
    for (const a of APRENDER) expect(lista).toContain(a);
  });

  test('ningún setInterval en app/src', () => {
    expect(donde(/\bsetInterval\s*\(/)).toEqual([]);
  });

  test('setTimeout solo en: cierre del aviso de rasgo (lector) y cambios de hora/día (tema y useAhora)', () => {
    expect(donde(/\bsetTimeout\s*\(/)).toEqual(['app/lectura/[id].tsx', 'lib/use-ahora.ts', 'theme/ThemeProvider.tsx']);
  });

  test('el único setTimeout de Aprender usa movimiento.avisoRasgoVisible y se limpia', () => {
    const lector = codigo.find((c) => c.archivo === 'app/lectura/[id].tsx')!.texto;
    const llamadas = lector.match(/setTimeout\([^;]*\);/g) ?? [];
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]).toMatch(/movimiento\.avisoRasgoVisible/);
    expect(lector).toMatch(/clearTimeout\(temporizador\)/);
  });

  test('quiz y lector: sin requestAnimationFrame, Date.now para medir tiempo, ni animaciones infinitas', () => {
    for (const a of ['app/quiz/[id].tsx', 'app/lectura/[id].tsx', 'components/acunacion.tsx', 'components/aviso-rasgo.tsx']) {
      const t = codigo.find((c) => c.archivo === a)!.texto;
      expect(t).not.toMatch(/requestAnimationFrame|performance\.now|withRepeat/);
    }
    // En el quiz no se mide el tiempo de ninguna forma.
    expect(codigo.find((c) => c.archivo === 'app/quiz/[id].tsx')!.texto).not.toMatch(/Date\.now|new Date\(/);
  });
});

describe('sin rachas, puntos ni contadores de días seguidos', () => {
  // "puntos" y "temporizador" no van aquí: lib/vitral.ts usa `puntos` (geometría) y los tres
  // setTimeout permitidos guardan su id en `temporizador`. Los textos sí se revisan con esas palabras.
  const PROHIBIDO =
    /racha|streak|seguid|consecutiv|in_?a_?row|\bscore\b|\bxp\b|countdown|cuenta_?regresiva|tiempo_?restante|time_?left|\bvidas\b|\blives\b/i;

  test('en el código (sin comentarios) de app/src', () => {
    expect(donde(PROHIBIDO)).toEqual([]);
  });

  const valores = (o: object, p = ''): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${p}${k}`, v] as [string, string]] : valores(v, `${p}${k}.`)));

  test.each([
    ['es', es],
    ['en', en],
  ] as const)('en los textos de %s.json', (_i, loc) => {
    const malos = valores(loc).filter(
      ([, v]) => /racha|streak|seguidos|in a row|consecutiv|\bpuntos\b|\bpoints\b|\bscore\b|cuenta regresiva|countdown|segundos|seconds|time left|tiempo restante/i.test(v),
    );
    expect(malos).toEqual([]);
  });
});

describe('claves aprender.* en es y en', () => {
  const plano = (o: object, p = ''): Record<string, string> =>
    Object.fromEntries(
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === 'string' ? [[`${p}${k}`, v]] : Object.entries(plano(v, `${p}${k}.`)),
      ),
    );
  const ES = plano(es.aprender, 'aprender.');
  const EN = plano(en.aprender, 'aprender.');
  const base = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, '');
  const vars = (s: string) => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

  test('mismas claves (sin contar sufijos de plural)', () => {
    expect([...new Set(Object.keys(EN).map(base))].sort()).toEqual([...new Set(Object.keys(ES).map(base))].sort());
  });

  test('mismas variables {{…}} en cada clave', () => {
    for (const k of Object.keys(ES)) {
      const enK = k in EN ? k : Object.keys(EN).find((x) => base(x) === base(k));
      expect([k, vars(EN[enK!])]).toEqual([k, vars(ES[k])]);
    }
  });

  test('ningún texto vacío; las letras de las alternativas alcanzan para 4', () => {
    for (const v of [...Object.values(ES), ...Object.values(EN)]) expect(v.trim().length).toBeGreaterThan(0);
    expect(ES['aprender.letrasOpciones'].length).toBeGreaterThanOrEqual(4);
    expect(EN['aprender.letrasOpciones'].length).toBeGreaterThanOrEqual(4);
  });

  test('las claves aprender.* usadas en el código existen en es.json', () => {
    const usadas = new Set(codigo.flatMap((c) => [...c.texto.matchAll(/['"`](aprender\.[A-Za-z0-9_.]+)['"`]/g)].map((m) => m[1])));
    const conocidas = new Set(Object.keys(ES).map(base));
    const faltan = [...usadas].filter((k) => !conocidas.has(k));
    expect(faltan).toEqual([]);
  });
});
