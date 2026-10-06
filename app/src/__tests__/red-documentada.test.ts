/// <reference types="jest" />
/*
 * Principio 2 · docs/red.md coincide con el código (complementa privacidad-red.test.ts).
 *
 * privacidad-red.test.ts fija la lista exacta de salidas (Linking/WebBrowser) en app/src. Esta prueba
 * revisa el otro lado: que cada archivo con una salida esté en la tabla "Salidas de la app" de
 * docs/red.md y que la tabla no nombre archivos que ya no tienen salidas. En particular, las dos de
 * Configuración: config/apoyo.tsx (patrocinio) y config/recordatorios.tsx (ajustes del sistema).
 */
declare const __dirname: string;
type Entrada = { name: string; isDirectory(): boolean };
const fs = require('fs') as {
  readdirSync(dir: string, o: { withFileTypes: true }): Entrada[];
  readFileSync(f: string, enc: 'utf8'): string;
};
const path = require('path') as { resolve(...p: string[]): string; join(...p: string[]): string; relative(a: string, b: string): string };

const APP = path.resolve(__dirname, '..', '..');
const SRC = path.join(APP, 'src');
const RED = fs.readFileSync(path.resolve(APP, '..', 'docs', 'red.md'), 'utf8');

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : archivos(p);
    return /\.(ts|tsx|js|jsx)$/.test(e.name) ? [p] : [];
  });
}

const sinComentarios = (c: string) => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
const SALIDA = /\b(?:Linking\.(?:openURL|openSettings|sendIntent)|WebBrowser\.\w+|openBrowserAsync|openAuthSessionAsync|openURL)\s*\(/;

/** Archivos con salidas en el código, como 'app/src/…'. */
const EN_CODIGO = archivos(SRC)
  .filter((f) => SALIDA.test(sinComentarios(fs.readFileSync(f, 'utf8'))))
  .map((f) => `app/src/${path.relative(SRC, f).replace(/\\/g, '/')}`)
  .sort();

/** Columna "Archivo" de la tabla "Salidas de la app" (solo rutas reales entre comillas invertidas). */
function enDocumento(): string[] {
  const seccion = RED.split(/^## /m).find((s) => s.startsWith('Salidas de la app'))!;
  const filas = seccion.split('\n').filter((l) => l.startsWith('|') && !/^\|\s*-/.test(l)).slice(1);
  return filas
    .map((l) => l.split('|').map((x) => x.trim()))
    .map((cols) => cols[cols.length - 2])
    .flatMap((celda) => [...celda.matchAll(/`([^`]+)`/g)].map((m) => m[1]))
    .sort();
}

test('docs/red.md tiene la tabla de salidas', () => {
  expect(enDocumento().length).toBeGreaterThanOrEqual(4);
});

test('cada archivo con una salida (Linking / WebBrowser) está en docs/red.md, y viceversa', () => {
  expect([...new Set(enDocumento())]).toEqual(EN_CODIGO);
});

test('Configuración: patrocinio (openURL) y recordatorios (openSettings) están documentados', () => {
  const doc = enDocumento();
  expect(doc).toContain('app/src/components/config/apoyo.tsx');
  expect(doc).toContain('app/src/components/config/recordatorios.tsx');
  const apoyo = sinComentarios(fs.readFileSync(path.join(SRC, 'components/config/apoyo.tsx'), 'utf8'));
  const rec = sinComentarios(fs.readFileSync(path.join(SRC, 'components/config/recordatorios.tsx'), 'utf8'));
  expect(apoyo.match(/Linking\.\w+\(/g)).toEqual(['Linking.openURL(']);
  expect(rec.match(/Linking\.\w+\(/g)).toEqual(['Linking.openSettings(']);
});
