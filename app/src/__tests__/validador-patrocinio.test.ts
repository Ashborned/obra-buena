/// <reference types="jest" />
/*
 * scripts/validar-contenido.mjs acepta `patrocinio` opcional: { nombre: { es, en }, url? (https) }.
 *
 * El script lee siempre <raíz>/content/contenido.json relativo a su propia ubicación, así que se
 * copia a una carpeta temporal con un contenido.json modificado (el real + el patrocinio de cada
 * caso) y se corre con node. Sin cambios al script.
 */
declare const __dirname: string;
declare const process: { execPath: string };
const fs = require('fs') as {
  readFileSync(f: string, enc: 'utf8'): string;
  writeFileSync(f: string, d: string): void;
  mkdirSync(d: string, o: { recursive: true }): void;
  mkdtempSync(prefijo: string): string;
  rmSync(d: string, o: { recursive: true; force: true }): void;
};
const path = require('path') as { resolve(...p: string[]): string; join(...p: string[]): string };
const os = require('os') as { tmpdir(): string };
const { spawnSync } = require('child_process') as {
  spawnSync(c: string, a: string[], o: { encoding: 'utf8' }): { status: number | null; stdout: string; stderr: string };
};

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const SCRIPT = fs.readFileSync(path.join(RAIZ, 'scripts', 'validar-contenido.mjs'), 'utf8');
const REAL = JSON.parse(fs.readFileSync(path.join(RAIZ, 'content', 'contenido.json'), 'utf8')) as Record<string, unknown>;

let tmp: string;
beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'obra-buena-validador-'));
  fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'content'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'scripts', 'validar-contenido.mjs'), SCRIPT);
});
afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const SIN = Symbol('sin patrocinio');

function validar(patrocinio: unknown) {
  const c = { ...REAL };
  delete c.patrocinio;
  if (patrocinio !== SIN) c.patrocinio = patrocinio;
  fs.writeFileSync(path.join(tmp, 'content', 'contenido.json'), JSON.stringify(c));
  const r = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'validar-contenido.mjs')], { encoding: 'utf8' });
  const errores = r.stdout.split('\n').filter((l) => l.startsWith('✗'));
  return { status: r.status, errores, salida: r.stdout + r.stderr };
}

const NOMBRE = { es: 'Parroquia de prueba', en: 'Test Parish' };

describe('validar-contenido.mjs: patrocinio', () => {
  test('el contenido real (sin cambios) pasa', () => {
    const r = validar(REAL.patrocinio === undefined ? SIN : REAL.patrocinio);
    expect(r.errores).toEqual([]);
    expect(r.status).toBe(0);
  });

  test('sin patrocinio → pasa (es opcional)', () => {
    const r = validar(SIN);
    expect(r.errores).toEqual([]);
    expect(r.status).toBe(0);
  });

  test('nombre es/en sin url → pasa', () => {
    expect(validar({ nombre: NOMBRE })).toMatchObject({ status: 0, errores: [] });
  });

  test('nombre es/en con url https → pasa', () => {
    expect(validar({ nombre: NOMBRE, url: 'https://parroquia.example.org' })).toMatchObject({ status: 0, errores: [] });
  });

  test.each([
    ['sin nombre.en', { nombre: { es: 'Parroquia' } }],
    ['sin nombre.es', { nombre: { en: 'Parish' } }],
    ['nombre.en vacío', { nombre: { es: 'Parroquia', en: '   ' } }],
    ['sin nombre', { url: 'https://parroquia.example.org' }],
    ['nombre como texto', { nombre: 'Parroquia' }],
    ['null', null],
  ])('%s → falla (falta nombre)', (_n, p) => {
    const r = validar(p);
    expect(r.status).toBe(1);
    expect(r.errores.join('\n')).toMatch(/patrocinio: falta nombre/);
  });

  test.each([
    ['http://', 'http://parroquia.example.org'],
    ['sin esquema', 'parroquia.example.org'],
    ['javascript:', 'javascript:alert(1)'],
    ['vacía', ''],
    ['número', 42],
    ['solo el esquema', 'https://'],
    ['con espacio', 'https:// parroquia.example.org'],
  ])('url %s → falla', (_n, url) => {
    const r = validar({ nombre: NOMBRE, url });
    expect(r.status).toBe(1);
    expect(r.errores.join('\n')).toMatch(/patrocinio: url debe ser una dirección https:\/\/ válida/);
  });
});
