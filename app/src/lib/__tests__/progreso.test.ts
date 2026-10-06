/// <reference types="jest" />
/*
 * Progreso local (velas por novena y año de la fiesta; rasgos, medallas y medallas de colección
 * de Aprender) con un doble de SQLite en memoria que entiende solo las consultas de `progreso.ts`.
 * Cualquier otra consulta lanza error.
 *
 * También prueba `aprender-progreso.ts` (registrarResultadoQuiz, leerProgresoAprender) sobre el
 * mismo doble, con el contenido real.
 */
import datos from '../../../../content/contenido.json';
import type { Contenido, Lectura } from '@/contenido/tipos';

import { estadoNovena } from '../novenas';
import { anioDeFiesta } from '../novenas-contenido';

type Vela = { novena: string; anio_fiesta: number; dia: number; encendida_en: string };
type Medalla = { lectura: string; puntaje: number; ganada_en: string };
type Rasgo = { lectura: string; rasgo: string; descubierto_en: string };
type MedallaColeccion = { coleccion: string; ganada_en: string };

const mockBD = {
  abierta: 0,
  version: 0,
  ddl: [] as string[],
  velas: [] as Vela[],
  medallas: [] as Medalla[],
  rasgos: [] as Rasgo[],
  colecciones: [] as MedallaColeccion[],
  consultas: [] as string[],
  /** Tablas extra que una migración futura podría crear (para probar borrarProgreso). */
  extra: {} as Record<string, unknown[]>,
  transacciones: 0,
};

jest.mock('expo-sqlite', () => {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const db = {
    execAsync: async (sql: string) => {
      const s = norm(sql);
      mockBD.consultas.push(s);
      const v = /^PRAGMA user_version = (\d+)$/.exec(s);
      const borrar = /^DELETE FROM (\w+)$/.exec(s);
      if (v) mockBD.version = Number(v[1]);
      else if (s.startsWith('CREATE TABLE')) mockBD.ddl.push(s);
      else if (borrar) {
        const t = borrar[1];
        if (t === 'velas') mockBD.velas = [];
        else if (t === 'rasgos') mockBD.rasgos = [];
        else if (t === 'medallas') mockBD.medallas = [];
        else if (t === 'medallas_coleccion') mockBD.colecciones = [];
        else if (t in mockBD.extra) mockBD.extra[t] = [];
        else throw new Error(`no such table: ${t}`);
      }
      else if (s !== 'PRAGMA journal_mode = WAL;') throw new Error(`execAsync no esperado: ${s}`);
    },
    getFirstAsync: async (sql: string) => {
      if (norm(sql) === 'PRAGMA user_version') return { user_version: mockBD.version };
      throw new Error(`getFirstAsync no esperado: ${sql}`);
    },
    withTransactionAsync: async (f: () => Promise<void>) => {
      mockBD.transacciones++;
      return f();
    },
    getAllAsync: async (sql: string, ...p: unknown[]) => {
      const s = norm(sql);
      mockBD.consultas.push(s);
      if (s === 'SELECT dia FROM velas WHERE novena = ? AND anio_fiesta = ? ORDER BY dia') {
        return mockBD.velas
          .filter((v) => v.novena === p[0] && v.anio_fiesta === p[1])
          .sort((a, b) => a.dia - b.dia)
          .map((v) => ({ dia: v.dia }));
      }
      if (s === "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'") {
        // Tablas creadas por las migraciones que corrieron + las extra (sqlite_* ya excluidas por el WHERE).
        const creadas = mockBD.ddl.flatMap((q) => [...q.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]));
        return [...creadas, ...Object.keys(mockBD.extra)].map((name) => ({ name }));
      }
      const por = <T,>(xs: T[], k: keyof T) => [...xs].sort((a, b) => String(a[k]).localeCompare(String(b[k])));
      if (s === 'SELECT lectura, puntaje, ganada_en FROM medallas ORDER BY ganada_en') {
        return por(mockBD.medallas, 'ganada_en').map((m) => ({ ...m }));
      }
      if (s === 'SELECT rasgo FROM rasgos WHERE lectura = ? ORDER BY descubierto_en') {
        return por(mockBD.rasgos, 'descubierto_en')
          .filter((r) => r.lectura === p[0])
          .map((r) => ({ rasgo: r.rasgo }));
      }
      if (s === 'SELECT lectura, rasgo FROM rasgos ORDER BY descubierto_en') {
        return por(mockBD.rasgos, 'descubierto_en').map((r) => ({ lectura: r.lectura, rasgo: r.rasgo }));
      }
      if (s === 'SELECT coleccion, ganada_en FROM medallas_coleccion ORDER BY ganada_en') {
        return por(mockBD.colecciones, 'ganada_en').map((c) => ({ ...c }));
      }
      throw new Error(`getAllAsync no esperado: ${s}`);
    },
    runAsync: async (sql: string, ...p: unknown[]) => {
      const s = norm(sql);
      mockBD.consultas.push(s);
      if (s.startsWith('INSERT OR IGNORE INTO velas')) {
        const [novena, anio_fiesta, dia, encendida_en] = p as [string, number, number, string];
        if (!Number.isInteger(dia) || dia < 1 || dia > 9) throw new Error('CHECK constraint failed: dia');
        const existe = mockBD.velas.some((v) => v.novena === novena && v.anio_fiesta === anio_fiesta && v.dia === dia);
        if (!existe) mockBD.velas.push({ novena, anio_fiesta, dia, encendida_en });
        return { changes: existe ? 0 : 1, lastInsertRowId: 0 };
      }
      if (s === 'DELETE FROM velas WHERE novena = ? AND anio_fiesta = ? AND dia = ?') {
        const antes = mockBD.velas.length;
        mockBD.velas = mockBD.velas.filter((v) => !(v.novena === p[0] && v.anio_fiesta === p[1] && v.dia === p[2]));
        return { changes: antes - mockBD.velas.length, lastInsertRowId: 0 };
      }
      if (s === 'INSERT OR IGNORE INTO rasgos (lectura, rasgo, descubierto_en) VALUES (?, ?, ?)') {
        const [lectura, rasgo, descubierto_en] = p as [string, string, string];
        const existe = mockBD.rasgos.some((r) => r.lectura === lectura && r.rasgo === rasgo);
        if (!existe) mockBD.rasgos.push({ lectura, rasgo, descubierto_en });
        return { changes: existe ? 0 : 1, lastInsertRowId: 0 };
      }
      if (s === 'INSERT OR IGNORE INTO medallas_coleccion (coleccion, ganada_en) VALUES (?, ?)') {
        const [coleccion, ganada_en] = p as [string, string];
        const existe = mockBD.colecciones.some((c) => c.coleccion === coleccion);
        if (!existe) mockBD.colecciones.push({ coleccion, ganada_en });
        return { changes: existe ? 0 : 1, lastInsertRowId: 0 };
      }
      if (
        s ===
        'INSERT INTO medallas (lectura, puntaje, ganada_en) VALUES (?, ?, ?) ON CONFLICT(lectura) DO UPDATE SET puntaje = MAX(puntaje, excluded.puntaje)'
      ) {
        const [lectura, puntaje, ganada_en] = p as [string, number, string];
        const m = mockBD.medallas.find((x) => x.lectura === lectura);
        if (m) m.puntaje = Math.max(m.puntaje, puntaje);
        else mockBD.medallas.push({ lectura, puntaje, ganada_en });
        return { changes: 1, lastInsertRowId: 0 };
      }
      throw new Error(`runAsync no esperado: ${s}`);
    },
  };
  return {
    openDatabaseAsync: jest.fn(async () => {
      mockBD.abierta++;
      return db;
    }),
  };
});

// aprender-progreso.ts importa el hook de foco de expo-router; aquí solo se prueban sus funciones.
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

type Progreso = typeof import('../progreso');
type AprenderProgreso = typeof import('../aprender-progreso');
let P: Progreso;
let AP: AprenderProgreso;

beforeEach(() => {
  Object.assign(mockBD, {
    abierta: 0,
    version: 0,
    ddl: [],
    velas: [],
    medallas: [],
    rasgos: [],
    colecciones: [],
    consultas: [],
    extra: {},
    transacciones: 0,
  });
  jest.isolateModules(() => {
    P = require('../progreso');
    AP = require('../aprender-progreso');
  });
});

const d = (a: number, m: number, dia: number) => new Date(a, m - 1, dia);

describe('base y migraciones', () => {
  test('se abre una sola vez y migra a user_version = MIGRACIONES.length', async () => {
    await Promise.all([P.velasEncendidas('ter', 2026), P.velasEncendidas('ter', 2026), P.medallas()]);
    expect(mockBD.abierta).toBe(1);
    expect(mockBD.version).toBe(P.MIGRACIONES.length);
  });

  test('principio 1: la tabla velas no tiene racha, puntos ni contador; puntaje solo en medallas', () => {
    const sql = P.MIGRACIONES.join('\n');
    const velas = /CREATE TABLE IF NOT EXISTS velas \(([\s\S]*?)\);/.exec(sql)?.[1] ?? '';
    expect(velas).toMatch(/novena/);
    expect(velas).not.toMatch(/racha|streak|punt|point|score|nivel|level|seguid|contador|count/i);
    expect(sql).not.toMatch(/racha|streak|points|score|nivel|level/i);
    const tablas = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]);
    expect(tablas).toEqual(['velas', 'rasgos', 'medallas', 'medallas_coleccion']);
    const medallas = /CREATE TABLE IF NOT EXISTS medallas \(([\s\S]*?)\);/.exec(sql)?.[1] ?? '';
    expect(medallas).toMatch(/lectura/);
    expect(medallas).not.toMatch(/novena|vela|emocion/i);
  });

  test('principio 1: medallas_coleccion solo guarda colección y fecha (sin racha, puntos ni contador)', () => {
    const sql = P.MIGRACIONES.join('\n');
    const cols = /CREATE TABLE IF NOT EXISTS medallas_coleccion \(([\s\S]*?)\);/.exec(sql)?.[1] ?? '';
    expect(cols).toMatch(/coleccion TEXT PRIMARY KEY/);
    expect(cols).not.toMatch(/racha|streak|punt|point|score|nivel|level|seguid|contador|count/i);
    const nombres = cols
      .split(',')
      .map((c) => c.trim().split(/\s+/)[0])
      .filter(Boolean);
    expect(nombres).toEqual(['coleccion', 'ganada_en']);
  });

  test('migración 2 sobre una base en versión 1 (persona que ya tenía velas y medallas)', async () => {
    mockBD.version = 1;
    mockBD.medallas.push({ lectura: 'pablo', puntaje: 5, ganada_en: '2026-10-01T00:00:00.000Z' });
    expect(await P.medallasColeccion()).toEqual([]);
    expect(mockBD.version).toBe(2);
    expect(mockBD.ddl).toHaveLength(1);
    expect(mockBD.ddl[0]).toMatch(/^CREATE TABLE IF NOT EXISTS medallas_coleccion/);
    expect(mockBD.medallas).toHaveLength(1);
  });
});

describe('velas por novena y año de la fiesta', () => {
  test('encender y leer, ordenadas por día', async () => {
    await P.encenderVela('ter', 2026, 3);
    await P.encenderVela('ter', 2026, 1);
    expect(await P.velasEncendidas('ter', 2026)).toEqual([1, 3]);
  });

  test('las velas de 2026 no aparecen en la novena de 2027 (misma novena), ni en otra novena', async () => {
    await P.encenderVela('ter', 2026, 1);
    await P.encenderVela('ter', 2026, 2);
    expect(await P.velasEncendidas('ter', 2027)).toEqual([]);
    expect(await P.velasEncendidas('bru', 2026)).toEqual([]);
    await P.encenderVela('ter', 2027, 5);
    expect(await P.velasEncendidas('ter', 2026)).toEqual([1, 2]);
    expect(await P.velasEncendidas('ter', 2027)).toEqual([5]);
  });

  test('novena de enero que empieza en diciembre guarda con el año de la fiesta', async () => {
    const e = estadoNovena({ mes: 1, dia: 5 }, d(2026, 12, 28));
    await P.encenderVela('epi', anioDeFiesta(e), e.dia!);
    expect(mockBD.velas).toEqual([expect.objectContaining({ novena: 'epi', anio_fiesta: 2027, dia: 2 })]);
    const e2 = estadoNovena({ mes: 1, dia: 5 }, d(2027, 1, 3));
    expect(await P.velasEncendidas('epi', anioDeFiesta(e2))).toEqual([2]);
  });

  test('encender dos veces el mismo día no duplica (INSERT OR IGNORE con parámetros)', async () => {
    await P.encenderVela('ter', 2026, 4);
    await P.encenderVela('ter', 2026, 4);
    expect(mockBD.velas).toHaveLength(1);
    expect(await P.velasEncendidas('ter', 2026)).toEqual([4]);
  });

  test('apagar quita solo ese día (de esa novena y ese año)', async () => {
    await P.encenderVela('ter', 2026, 1);
    await P.encenderVela('ter', 2026, 2);
    await P.encenderVela('ter', 2027, 2);
    await P.encenderVela('bru', 2026, 2);
    await P.apagarVela('ter', 2026, 2);
    expect(await P.velasEncendidas('ter', 2026)).toEqual([1]);
    expect(await P.velasEncendidas('ter', 2027)).toEqual([2]);
    expect(await P.velasEncendidas('bru', 2026)).toEqual([2]);
  });

  test('el día fuera de 1–9 lo rechaza la restricción CHECK del esquema', async () => {
    expect(P.MIGRACIONES[0]).toMatch(/CHECK \(dia BETWEEN 1 AND 9\)/);
    await expect(P.encenderVela('ter', 2026, 10)).rejects.toThrow(/CHECK/);
  });

  test('encendida_en es una fecha ISO; no se guarda nada más de la persona', async () => {
    await P.encenderVela('ter', 2026, 1);
    expect(Object.keys(mockBD.velas[0]).sort()).toEqual(['anio_fiesta', 'dia', 'encendida_en', 'novena']);
    expect(Number.isNaN(Date.parse(mockBD.velas[0].encendida_en))).toBe(false);
  });
});

describe('medallas (solo Aprender)', () => {
  test('ganar dos veces conserva el mejor puntaje', async () => {
    await P.ganarMedalla('pedro', 4);
    await P.ganarMedalla('pedro', 3);
    await P.ganarMedalla('pedro', 5);
    expect((await P.medallas()).map((m) => [m.lectura, m.puntaje])).toEqual([['pedro', 5]]);
  });
});

// -------------------------------------------------------------------------------------------------
// Aprender: rasgos, medallas de colección y registrarResultadoQuiz (con el contenido real)

const real = datos as unknown as Contenido;
const lectura = (id: string) => real.lecturas.find((l) => l.id === id) as Lectura;
const ESCRITURA = /^(INSERT|UPDATE|DELETE|REPLACE)\b/i;
const escrituras = () => mockBD.consultas.filter((q) => ESCRITURA.test(q));

/** Corre `f` con el reloj fijo en `iso` (solo se finge Date; las promesas siguen normales). */
async function enFecha(iso: string, f: () => Promise<unknown>) {
  jest.useFakeTimers({ now: new Date(iso), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  try {
    await f();
  } finally {
    jest.useRealTimers();
  }
}

describe('rasgos descubiertos una sola vez', () => {
  test('descubrirRasgo dos veces → una fila; la segunda devuelve false', async () => {
    expect(await P.descubrirRasgo('pablo', 'light')).toBe(true);
    expect(await P.descubrirRasgo('pablo', 'light')).toBe(false);
    expect(mockBD.rasgos).toHaveLength(1);
    expect(await P.rasgosDescubiertos('pablo')).toEqual(['light']);
  });

  test('el mismo rasgo en otra lectura es otra fila', async () => {
    expect(await P.descubrirRasgo('pablo', 'light')).toBe(true);
    expect(await P.descubrirRasgo('pedro', 'light')).toBe(true);
    expect(mockBD.rasgos).toHaveLength(2);
  });

  test('todosLosRasgos agrupa por lectura en orden de descubrimiento', async () => {
    await enFecha('2026-10-05T10:00:00.000Z', () => P.descubrirRasgo('pablo', 'sword'));
    await enFecha('2026-10-05T10:01:00.000Z', () => P.descubrirRasgo('pedro', 'keys'));
    await enFecha('2026-10-05T10:02:00.000Z', () => P.descubrirRasgo('pablo', 'light'));
    expect(await P.todosLosRasgos()).toEqual({ pablo: ['sword', 'light'], pedro: ['keys'] });
    expect(await P.rasgosDescubiertos('pablo')).toEqual(['sword', 'light']);
  });

  test('descubierto_en es fecha ISO; no se guarda nada más', async () => {
    await P.descubrirRasgo('pablo', 'light');
    expect(Object.keys(mockBD.rasgos[0]).sort()).toEqual(['descubierto_en', 'lectura', 'rasgo']);
    expect(new Date(mockBD.rasgos[0].descubierto_en).toISOString()).toBe(mockBD.rasgos[0].descubierto_en);
  });
});

describe('medallas de colección', () => {
  test('ganar dos veces → una fila con la fecha original', async () => {
    await enFecha('2026-10-05T10:00:00.000Z', () => P.ganarMedallaColeccion('apo'));
    await enFecha('2026-11-01T10:00:00.000Z', () => P.ganarMedallaColeccion('apo'));
    expect(await P.medallasColeccion()).toEqual([{ coleccion: 'apo', ganadaEn: '2026-10-05T10:00:00.000Z' }]);
  });
});

describe('registrarResultadoQuiz: aprobar', () => {
  test('5/5: guarda la medalla con fecha ISO y puntaje, y descubre los 3 rasgos', async () => {
    const r = await AP.registrarResultadoQuiz(lectura('pablo'), 5, real);
    expect(r).toEqual({ aciertos: 5, aprobado: true, medallaNueva: true, coleccionesNuevas: [] });
    expect(mockBD.medallas).toHaveLength(1);
    const m = mockBD.medallas[0];
    expect([m.lectura, m.puntaje]).toEqual(['pablo', 5]);
    expect(new Date(m.ganada_en).toISOString()).toBe(m.ganada_en);
    expect([...(await P.rasgosDescubiertos('pablo'))].sort()).toEqual(['book', 'light', 'sword']);
  });

  test('4/5 aprueba (umbral lectura.pass)', async () => {
    const r = await AP.registrarResultadoQuiz(lectura('pedro'), 4, real);
    expect(r.aprobado).toBe(true);
    expect(mockBD.medallas.map((x) => [x.lectura, x.puntaje])).toEqual([['pedro', 4]]);
  });

  test('aprobar no duplica los rasgos que ya se descubrieron leyendo', async () => {
    await P.descubrirRasgo('pablo', 'book');
    await AP.registrarResultadoQuiz(lectura('pablo'), 5, real);
    expect(mockBD.rasgos.filter((x) => x.lectura === 'pablo')).toHaveLength(3);
    expect(new Set(mockBD.rasgos.map((x) => x.rasgo))).toEqual(new Set(['light', 'book', 'sword']));
  });

  test('el puntaje guardado es el mejor, y ganar de nuevo informa medallaNueva = false', async () => {
    await AP.registrarResultadoQuiz(lectura('pablo'), 4, real);
    const r = await AP.registrarResultadoQuiz(lectura('pablo'), 5, real);
    expect(r).toMatchObject({ aprobado: true, medallaNueva: false });
    await AP.registrarResultadoQuiz(lectura('pablo'), 4, real);
    expect(mockBD.medallas.map((x) => [x.lectura, x.puntaje])).toEqual([['pablo', 5]]);
    expect(mockBD.rasgos).toHaveLength(3);
  });
});

describe('registrarResultadoQuiz: reprobar (sin castigo)', () => {
  test('3/5 no aprueba y no escribe nada en la base', async () => {
    const r = await AP.registrarResultadoQuiz(lectura('pablo'), 3, real);
    expect(r).toEqual({ aciertos: 3, aprobado: false, medallaNueva: false, coleccionesNuevas: [] });
    expect(escrituras()).toEqual([]);
    expect(mockBD.medallas).toEqual([]);
    expect(mockBD.rasgos).toEqual([]);
    expect(mockBD.colecciones).toEqual([]);
  });

  test('0/5 tampoco escribe nada', async () => {
    await AP.registrarResultadoQuiz(lectura('pedro'), 0, real);
    expect(escrituras()).toEqual([]);
  });

  test('reprobar después de tener la medalla no la quita ni cambia su fecha ni puntaje', async () => {
    await AP.registrarResultadoQuiz(lectura('pablo'), 4, real);
    const antes = JSON.parse(JSON.stringify({ m: mockBD.medallas, r: mockBD.rasgos }));
    mockBD.consultas = [];
    const r = await AP.registrarResultadoQuiz(lectura('pablo'), 2, real);
    expect(r.aprobado).toBe(false);
    expect(escrituras()).toEqual([]);
    expect({ m: mockBD.medallas, r: mockBD.rasgos }).toEqual(antes);
  });

  test('reprobar y luego aprobar otorga la medalla (reintento inmediato)', async () => {
    expect((await AP.registrarResultadoQuiz(lectura('teresa'), 3, real)).aprobado).toBe(false);
    const r = await AP.registrarResultadoQuiz(lectura('teresa'), 4, real);
    expect(r).toMatchObject({ aprobado: true, medallaNueva: true });
    expect(mockBD.medallas.map((x) => x.lectura)).toEqual(['teresa']);
  });

  test('la fecha de la medalla es la del primer aprobado, aunque se repruebe y apruebe después', async () => {
    await enFecha('2026-10-05T10:00:00.000Z', () => AP.registrarResultadoQuiz(lectura('pablo'), 4, real));
    await enFecha('2026-12-25T10:00:00.000Z', async () => {
      await AP.registrarResultadoQuiz(lectura('pablo'), 1, real);
      await AP.registrarResultadoQuiz(lectura('pablo'), 5, real);
    });
    expect(mockBD.medallas).toEqual([{ lectura: 'pablo', puntaje: 5, ganada_en: '2026-10-05T10:00:00.000Z' }]);
  });
});

describe('registrarResultadoQuiz: medalla de colección', () => {
  test('"apo": la primera medalla no la completa; la segunda la otorga una sola vez', async () => {
    const r1 = await AP.registrarResultadoQuiz(lectura('pablo'), 5, real);
    expect(r1.coleccionesNuevas).toEqual([]);
    expect(mockBD.colecciones).toEqual([]);

    const r2 = await AP.registrarResultadoQuiz(lectura('pedro'), 4, real);
    expect(r2.coleccionesNuevas).toEqual(['apo']);
    expect(mockBD.colecciones.map((c) => c.coleccion)).toEqual(['apo']);

    // Volver a aprobar cualquiera de las dos no la otorga de nuevo.
    expect((await AP.registrarResultadoQuiz(lectura('pablo'), 5, real)).coleccionesNuevas).toEqual([]);
    expect((await AP.registrarResultadoQuiz(lectura('pedro'), 5, real)).coleccionesNuevas).toEqual([]);
    expect(mockBD.colecciones).toHaveLength(1);
  });

  test('reprobar no otorga la medalla de colección', async () => {
    await AP.registrarResultadoQuiz(lectura('pablo'), 5, real);
    const r = await AP.registrarResultadoQuiz(lectura('pedro'), 3, real);
    expect(r.coleccionesNuevas).toEqual([]);
    expect(mockBD.colecciones).toEqual([]);
  });

  test('aprobar una lectura de otra colección no otorga "apo" (con una sola medalla en apo)', async () => {
    await AP.registrarResultadoQuiz(lectura('pablo'), 5, real);
    const r = await AP.registrarResultadoQuiz(lectura('teresa'), 5, real);
    expect(r.coleccionesNuevas).toEqual([]);
  });

  test('"chile" con teresa y hurtado; "maria" (sin lecturas publicadas) nunca se completa', async () => {
    for (const id of ['pablo', 'pedro', 'teresa']) await AP.registrarResultadoQuiz(lectura(id), 5, real);
    const r = await AP.registrarResultadoQuiz(lectura('hurtado'), 5, real);
    expect(r.coleccionesNuevas).toEqual(['chile']);
    expect(mockBD.colecciones.map((c) => c.coleccion).sort()).toEqual(['apo', 'chile']);
  });

  test('una medalla de colección ya ganada se conserva si luego se publica otra lectura en ella', async () => {
    await AP.registrarResultadoQuiz(lectura('pablo'), 5, real);
    await AP.registrarResultadoQuiz(lectura('pedro'), 5, real);
    const fecha = mockBD.colecciones[0].ganada_en;
    // Se publica "andres" (hoy próximamente) dentro de "apo".
    const andres = { ...lectura('pablo'), id: 'andres' } as Lectura;
    const nuevo = { ...real, lecturas: [...real.lecturas, andres] };
    const r = await AP.registrarResultadoQuiz(lectura('teresa'), 5, nuevo);
    expect(r.coleccionesNuevas).toEqual([]);
    expect(mockBD.colecciones).toEqual([{ coleccion: 'apo', ganada_en: fecha }]);
    expect(escrituras().filter((q) => /^DELETE/i.test(q) && /medallas/.test(q))).toEqual([]);
  });

  // Hallazgo (informe QA): coleccionesPorOtorgar revisa TODAS las colecciones, no solo las de la
  // lectura aprobada. Si "apo" quedó completa sin su medalla de colección (medallas de pablo y pedro
  // ganadas antes de la migración 2), se otorga al aprobar una lectura de OTRA colección (teresa),
  // y la pantalla de resultado de Teresa anunciaría "Apóstoles completa". Esta prueba fija el
  // comportamiento actual; si el arquitecto decide otra regla, se cambia aquí.
  test('el quiz de teresa no anuncia "apo", aunque esté completa sin su medalla', async () => {
    mockBD.version = 1; // base anterior a medallas_coleccion
    mockBD.medallas.push(
      { lectura: 'pablo', puntaje: 5, ganada_en: '2026-10-01T00:00:00.000Z' },
      { lectura: 'pedro', puntaje: 5, ganada_en: '2026-10-02T00:00:00.000Z' },
    );
    const r = await AP.registrarResultadoQuiz(lectura('teresa'), 5, real);
    expect(r.coleccionesNuevas).toEqual([]);
  });
});

describe('leerProgresoAprender', () => {
  test('sin nada guardado: todo vacío', async () => {
    const p = await AP.leerProgresoAprender();
    expect(p.medallas.size).toBe(0);
    expect(p.rasgos).toEqual({});
    expect(p.colecciones.size).toBe(0);
  });

  test('refleja medallas, rasgos y colecciones guardadas', async () => {
    await P.descubrirRasgo('teresa', 'pen');
    await AP.registrarResultadoQuiz(lectura('pablo'), 5, real);
    await AP.registrarResultadoQuiz(lectura('pedro'), 4, real);
    const p = await AP.leerProgresoAprender();
    expect([...p.medallas.keys()].sort()).toEqual(['pablo', 'pedro']);
    for (const f of p.medallas.values()) expect(new Date(f).toISOString()).toBe(f);
    expect(p.rasgos.teresa).toEqual(['pen']);
    expect([...p.rasgos.pablo].sort()).toEqual(['book', 'light', 'sword']);
    expect([...p.colecciones.keys()]).toEqual(['apo']);
  });
});

// -------------------------------------------------------------------------------------------------
// "Borrar mis datos" (hito 7): borrarProgreso

describe('borrarProgreso', () => {
  async function llenar() {
    await P.encenderVela('ter', 2026, 1);
    await P.encenderVela('bru', 2027, 9);
    await P.descubrirRasgo('pablo', 'light');
    await P.ganarMedalla('pablo', 5);
    await P.ganarMedallaColeccion('apo');
  }

  test('vacía velas, rasgos, medallas y medallas_coleccion', async () => {
    await llenar();
    expect(mockBD.velas.length + mockBD.rasgos.length + mockBD.medallas.length + mockBD.colecciones.length).toBe(5);
    await P.borrarProgreso();
    expect(mockBD.velas).toEqual([]);
    expect(mockBD.rasgos).toEqual([]);
    expect(mockBD.medallas).toEqual([]);
    expect(mockBD.colecciones).toEqual([]);
    expect(await P.velasEncendidas('ter', 2026)).toEqual([]);
    expect(await P.todosLosRasgos()).toEqual({});
    expect(await P.medallas()).toEqual([]);
    expect(await P.medallasColeccion()).toEqual([]);
  });

  test('conserva el esquema y user_version: sin DROP, sin PRAGMA user_version, sin volver a migrar', async () => {
    await llenar();
    const ddlAntes = [...mockBD.ddl];
    mockBD.consultas = [];
    await P.borrarProgreso();
    expect(mockBD.version).toBe(P.MIGRACIONES.length);
    expect(mockBD.ddl).toEqual(ddlAntes);
    expect(mockBD.consultas.filter((q) => /DROP|ALTER|PRAGMA|CREATE/i.test(q))).toEqual([]);
    expect(mockBD.consultas.filter((q) => q.startsWith('DELETE FROM')).sort()).toEqual(
      ['DELETE FROM medallas', 'DELETE FROM medallas_coleccion', 'DELETE FROM rasgos', 'DELETE FROM velas'],
    );
    expect(mockBD.abierta).toBe(1);
  });

  test('los DELETE van dentro de una transacción', async () => {
    await llenar();
    const antes = mockBD.transacciones;
    await P.borrarProgreso();
    expect(mockBD.transacciones).toBe(antes + 1);
  });

  test('después de borrar se puede volver a usar como recién instalada', async () => {
    await llenar();
    await P.borrarProgreso();
    await P.encenderVela('ter', 2026, 2);
    expect(await P.velasEncendidas('ter', 2026)).toEqual([2]);
    expect(await P.descubrirRasgo('pablo', 'light')).toBe(true);
  });

  test('sin datos (base recién creada): no falla', async () => {
    await expect(P.borrarProgreso()).resolves.toBeUndefined();
  });

  test('una tabla futura (leída de sqlite_master) también se vacía', async () => {
    mockBD.extra.favoritos = [{ id: 'x' }];
    await P.borrarProgreso();
    expect(mockBD.extra.favoritos).toEqual([]);
  });

  test('un nombre de tabla que no es identificador simple no se interpola: el borrado avisa', async () => {
    mockBD.extra['x; DROP TABLE velas'] = [{}];
    await expect(P.borrarProgreso()).rejects.toThrow(/nombre inesperado/);
    expect(mockBD.consultas.some((q) => /DROP/i.test(q))).toBe(false);
  });

  test('una tabla futura con dígitos o mayúsculas también se vacía', async () => {
    mockBD.extra.lecturas_v2 = [{}];
    await P.borrarProgreso();
    expect(mockBD.consultas).toContain('DELETE FROM lecturas_v2');
  });
});
