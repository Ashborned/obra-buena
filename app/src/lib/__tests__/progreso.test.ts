/// <reference types="jest" />
/*
 * Progreso local (velas por novena y año de la fiesta) con un doble de SQLite en memoria
 * que entiende solo las consultas de `progreso.ts`. Cualquier otra consulta lanza error.
 */
import { estadoNovena } from '../novenas';
import { anioDeFiesta } from '../novenas-contenido';

type Vela = { novena: string; anio_fiesta: number; dia: number; encendida_en: string };
type Medalla = { lectura: string; puntaje: number; ganada_en: string };

const mockBD = {
  abierta: 0,
  version: 0,
  ddl: [] as string[],
  velas: [] as Vela[],
  medallas: [] as Medalla[],
  consultas: [] as string[],
};

jest.mock('expo-sqlite', () => {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const db = {
    execAsync: async (sql: string) => {
      const s = norm(sql);
      mockBD.consultas.push(s);
      const v = /^PRAGMA user_version = (\d+)$/.exec(s);
      if (v) mockBD.version = Number(v[1]);
      else if (s.startsWith('CREATE TABLE')) mockBD.ddl.push(s);
      else if (s !== 'PRAGMA journal_mode = WAL;') throw new Error(`execAsync no esperado: ${s}`);
    },
    getFirstAsync: async (sql: string) => {
      if (norm(sql) === 'PRAGMA user_version') return { user_version: mockBD.version };
      throw new Error(`getFirstAsync no esperado: ${sql}`);
    },
    withTransactionAsync: async (f: () => Promise<void>) => f(),
    getAllAsync: async (sql: string, ...p: unknown[]) => {
      const s = norm(sql);
      mockBD.consultas.push(s);
      if (s === 'SELECT dia FROM velas WHERE novena = ? AND anio_fiesta = ? ORDER BY dia') {
        return mockBD.velas
          .filter((v) => v.novena === p[0] && v.anio_fiesta === p[1])
          .sort((a, b) => a.dia - b.dia)
          .map((v) => ({ dia: v.dia }));
      }
      if (s === 'SELECT lectura, puntaje, ganada_en FROM medallas ORDER BY ganada_en') return [...mockBD.medallas];
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
      if (s.startsWith('INSERT INTO medallas')) {
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

type Progreso = typeof import('../progreso');
let P: Progreso;

beforeEach(() => {
  Object.assign(mockBD, { abierta: 0, version: 0, ddl: [], velas: [], medallas: [], consultas: [] });
  jest.isolateModules(() => {
    P = require('../progreso');
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
    expect(tablas).toEqual(['velas', 'rasgos', 'medallas']);
    const medallas = /CREATE TABLE IF NOT EXISTS medallas \(([\s\S]*?)\);/.exec(sql)?.[1] ?? '';
    expect(medallas).toMatch(/lectura/);
    expect(medallas).not.toMatch(/novena|vela|emocion/i);
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
