/// <reference types="jest" />
/*
 * Hito 7 · "Apoyar la app" no desbloquea nada (principio 3, docs/apoyo.md).
 *
 * - El servicio simulado responde 'gracias' sin escribir en kv-store, SQLite ni ningún estado.
 * - El servicio no disponible no ofrece aportes.
 * - En producción (__DEV__ false) se usa el no disponible.
 * - Ningún archivo de src/ lee un estado de "apoyó" / "supporter" / "premium" / "pro".
 */
declare const __dirname: string;
type Entrada = { name: string; isDirectory(): boolean };
const fs = require('fs') as {
  readdirSync(dir: string, o: { withFileTypes: true }): Entrada[];
  readFileSync(f: string, enc: 'utf8'): string;
};
const path = require('path') as { resolve(...p: string[]): string; join(...p: string[]): string; relative(a: string, b: string): string };

const mockEscrituras: string[] = [];
jest.mock('expo-sqlite/kv-store', () => {
  const anotar = (n: string) => jest.fn(async () => void mockEscrituras.push(`kv.${n}`));
  const Storage = {
    getItemSync: jest.fn(() => null),
    getAllKeysSync: jest.fn(() => []),
    setItemAsync: anotar('setItemAsync'),
    setItemSync: jest.fn(() => void mockEscrituras.push('kv.setItemSync')),
    removeItemAsync: anotar('removeItemAsync'),
    clearAsync: anotar('clearAsync'),
  };
  return { __esModule: true, default: Storage, Storage };
});
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => {
    mockEscrituras.push('sqlite.open');
    throw new Error('no debería abrirse');
  }),
  openDatabaseSync: jest.fn(() => {
    mockEscrituras.push('sqlite.openSync');
    throw new Error('no debería abrirse');
  }),
}));

import { PRODUCTOS_APOYO, servicioApoyo, servicioNoDisponible, servicioSimulado, type IdAporte } from '../apoyo';
import * as Apoyo from '../apoyo';

beforeEach(() => {
  mockEscrituras.length = 0;
});

describe('PRODUCTOS_APOYO', () => {
  test('tres productos, en orden, ids estables de tienda', () => {
    expect(PRODUCTOS_APOYO).toEqual(['apoyo_pequeno', 'apoyo_mediano', 'apoyo_grande']);
    for (const id of PRODUCTOS_APOYO) expect(id).toMatch(/^[a-z0-9_]+$/);
  });
});

describe('servicioSimulado: no cobra, no guarda, no desbloquea', () => {
  test('simulado = true (la interfaz lo marca como "Compra simulada")', () => {
    expect(servicioSimulado.simulado).toBe(true);
  });

  test('aportes(): los 3 productos en orden, con precio null', async () => {
    expect(await servicioSimulado.aportes()).toEqual([
      { id: 'apoyo_pequeno', precio: null },
      { id: 'apoyo_mediano', precio: null },
      { id: 'apoyo_grande', precio: null },
    ]);
  });

  test.each(PRODUCTOS_APOYO)('aportar(%p) → "gracias", sin escribir nada', async (id) => {
    const antes = JSON.stringify(await servicioSimulado.aportes());
    expect(await servicioSimulado.aportar(id)).toBe('gracias');
    expect(mockEscrituras).toEqual([]);
    // Nada cambia después de aportar: ni los aportes, ni las claves del servicio, ni el módulo.
    expect(JSON.stringify(await servicioSimulado.aportes())).toBe(antes);
    expect(Object.keys(servicioSimulado).sort()).toEqual(['aportar', 'aportes', 'simulado']);
  });

  test('se puede aportar más de una vez (consumible): siempre "gracias"', async () => {
    for (let i = 0; i < 3; i++) expect(await servicioSimulado.aportar('apoyo_grande')).toBe('gracias');
    expect(mockEscrituras).toEqual([]);
  });

  test('id desconocido → "error"', async () => {
    expect(await servicioSimulado.aportar('premium' as IdAporte)).toBe('error');
    expect(await servicioSimulado.aportar('' as IdAporte)).toBe('error');
    expect(mockEscrituras).toEqual([]);
  });

  test('el módulo no expone ningún estado de "apoyó" (solo servicios, ids y la fábrica)', () => {
    expect(Object.keys(Apoyo).sort()).toEqual(
      ['PRODUCTOS_APOYO', 'servicioApoyo', 'servicioNoDisponible', 'servicioSimulado'].sort(),
    );
  });
});

describe('servicioNoDisponible', () => {
  test('sin aportes y "no_disponible"; no escribe nada', async () => {
    expect(servicioNoDisponible.simulado).toBe(false);
    expect(await servicioNoDisponible.aportes()).toEqual([]);
    for (const id of PRODUCTOS_APOYO) expect(await servicioNoDisponible.aportar(id)).toBe('no_disponible');
    expect(mockEscrituras).toEqual([]);
  });
});

describe('servicioApoyo según el entorno', () => {
  const g = globalThis as unknown as { __DEV__: boolean };
  const original = g.__DEV__;
  afterEach(() => {
    g.__DEV__ = original;
  });

  test('__DEV__ true → simulado', () => {
    g.__DEV__ = true;
    expect(servicioApoyo()).toBe(servicioSimulado);
  });

  test('__DEV__ false (tienda) → no disponible: sin botones de compra', async () => {
    g.__DEV__ = false;
    expect(servicioApoyo()).toBe(servicioNoDisponible);
    expect(await servicioApoyo().aportes()).toEqual([]);
  });
});

// -------------------------------------------------------------------------------------------------

const SRC = path.resolve(__dirname, '..', '..');

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : archivos(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

/** Quita comentarios (// y /* *\/). */
function codigo(f: string): string {
  return fs
    .readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Además vacía las cadenas de texto (claves de i18n como 'configuracion.apoyo.titulo' son legítimas). */
function sinCadenas(c: string): string {
  return c.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");
}

describe('grep: ningún archivo de src/ habilita algo por haber apoyado', () => {
  // Identificadores de "estado de apoyador" en es/en (fuera de cadenas de texto).
  // "pro" solo como palabra aislada o isPro/esPro. "apoyo" a secas no: nombra la sección y el servicio.
  const SOSPECHOSOS =
    /apoyó|\b(haApoyado|yaApoyo|esApoyador|apoyador(es)?|apoyoActivo|supporter|isSupporter|hasSupported|premium|isPremium|esPremium|isPro|esPro|unlock(ed)?|desbloquea(do|r)?|entitlements?|purchased|comprado|pagado|isPaid|pro)\b/i;

  test('src/ existe y tiene archivos', () => {
    expect(archivos(SRC).length).toBeGreaterThan(20);
  });

  test('sin identificadores de apoyador en el código (sin comentarios)', () => {
    const hallazgos: string[] = [];
    for (const f of archivos(SRC)) {
      const rel = path.relative(SRC, f).replace(/\\/g, '/');
      sinCadenas(codigo(f))
        .split('\n')
        .forEach((linea, i) => {
          if (SOSPECHOSOS.test(linea)) hallazgos.push(`${rel}:${i + 1}: ${linea.trim()}`);
        });
    }
    expect(hallazgos).toEqual([]);
  });

  test('solo la pantalla de Configuración (y apoyo.ts) importan el servicio de apoyo', () => {
    const importan = archivos(SRC)
      .filter((f) => /from ['"](@\/lib\/apoyo|\.\.?\/(lib\/)?apoyo)['"]/.test(codigo(f)))
      .map((f) => path.relative(SRC, f).replace(/\\/g, '/'));
    for (const f of importan) expect(f).toMatch(/^(app\/configuracion\.tsx|components\/(config\/)?[^/]*apoy[^/]*\.tsx)$/);
  });

  test('ninguna clave de kv-store ni tabla de SQLite habla de apoyo', () => {
    const todo = archivos(SRC).map(codigo).join('\n');
    const claves = [...todo.matchAll(/['"`](preferencias\.[\w.]+|recordatorios\.[\w.]*)['"`]/g)].map((m) => m[1]);
    for (const c of claves) expect(c).not.toMatch(/apoy|support|premium|pro\b|compra|purchase/i);
    const tablas = [...todo.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]);
    for (const t of tablas) expect(t).not.toMatch(/apoy|support|premium|compra|purchase/i);
  });
});
