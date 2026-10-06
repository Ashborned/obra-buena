/// <reference types="jest" />
/*
 * Hito 7 · "Borrar mis datos" deja el teléfono como recién instalado (docs/decisiones.md, 2026-10-05).
 *
 * Dobles:
 * - expo-sqlite: tablas en memoria; entiende CREATE/PRAGMA/INSERT/DELETE FROM y sqlite_master.
 * - expo-sqlite/kv-store: objeto en memoria con clearAsync.
 * - expo-notifications: avisos programados en un Map (vía `moduloNotificaciones`, que puede ser null).
 * - expo-localization: idioma y región del teléfono.
 * i18n, preferencias, progreso, recordatorios y otra-oracion son los reales.
 */
const mockTablas: Record<string, Record<string, unknown>[]> = {};
const mockSQL = { version: 0, consultas: [] as string[] };

jest.mock('expo-sqlite', () => {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const db = {
    execAsync: async (sql: string) => {
      for (const parte of norm(sql).split(';').map((x) => x.trim()).filter(Boolean)) {
        mockSQL.consultas.push(parte);
        const crear = /^CREATE TABLE IF NOT EXISTS (\w+)/.exec(parte);
        const version = /^PRAGMA user_version = (\d+)$/.exec(parte);
        const borrar = /^DELETE FROM (\w+)$/.exec(parte);
        if (crear) mockTablas[crear[1]] ??= [];
        else if (version) mockSQL.version = Number(version[1]);
        else if (borrar) {
          if (!(borrar[1] in mockTablas)) throw new Error(`no such table: ${borrar[1]}`);
          mockTablas[borrar[1]] = [];
        } else if (parte !== 'PRAGMA journal_mode = WAL') throw new Error(`execAsync no esperado: ${parte}`);
      }
    },
    getFirstAsync: async (sql: string) => {
      if (norm(sql) === 'PRAGMA user_version') return { user_version: mockSQL.version };
      throw new Error(`getFirstAsync no esperado: ${sql}`);
    },
    withTransactionAsync: async (f: () => Promise<void>) => f(),
    getAllAsync: async (sql: string) => {
      const s = norm(sql);
      mockSQL.consultas.push(s);
      if (/FROM sqlite_master/.test(s)) return Object.keys(mockTablas).map((name) => ({ name }));
      const de = /FROM (\w+)/.exec(s);
      if (de && de[1] in mockTablas) return mockTablas[de[1]].map((f) => ({ ...f }));
      throw new Error(`getAllAsync no esperado: ${s}`);
    },
    runAsync: async (sql: string, ...p: unknown[]) => {
      const s = norm(sql);
      mockSQL.consultas.push(s);
      const ins = /^INSERT (?:OR IGNORE )?INTO (\w+) \(([^)]+)\)/.exec(s);
      if (!ins) throw new Error(`runAsync no esperado: ${s}`);
      const cols = ins[2].split(',').map((c) => c.trim());
      mockTablas[ins[1]].push(Object.fromEntries(cols.map((c, i) => [c, p[i]])));
      return { changes: 1, lastInsertRowId: 0 };
    },
  };
  return { openDatabaseAsync: async () => db };
});

const mockKV: Record<string, string> = {};
jest.mock('expo-sqlite/kv-store', () => {
  const Storage = {
    getItemSync: (k: string) => (k in mockKV ? mockKV[k] : null),
    getAllKeysSync: () => Object.keys(mockKV),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      mockKV[k] = v;
    }),
    removeItemAsync: async (k: string) => {
      delete mockKV[k];
    },
    clearAsync: jest.fn(async () => {
      for (const k of Object.keys(mockKV)) delete mockKV[k];
    }),
  };
  return { __esModule: true, default: Storage, Storage };
});

const mockAvisos = { siguiente: 0, programados: new Map<string, unknown>() };
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: async () => ({ granted: true, canAskAgain: true, status: 'granted' }),
  requestPermissionsAsync: async () => ({ granted: true, canAskAgain: true, status: 'granted' }),
  setNotificationChannelAsync: async () => null,
  scheduleNotificationAsync: async (req: unknown) => {
    const id = `id-${++mockAvisos.siguiente}`;
    mockAvisos.programados.set(id, req);
    return id;
  },
  cancelScheduledNotificationAsync: async (id: string) => {
    mockAvisos.programados.delete(id);
  },
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockAvisos.programados.clear();
  }),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
const mockProgramados = mockAvisos.programados;

/** `null` simula Expo Go en Android (sin módulo de notificaciones). */
let mockModuloNotificaciones: unknown = null;
jest.mock('../avisos', () => ({ moduloNotificaciones: () => mockModuloNotificaciones }));

const mockLocales = { lista: [{ languageCode: 'es', regionCode: 'CL', languageTag: 'es-CL' }] as unknown[] };
jest.mock('expo-localization', () => ({ getLocales: () => mockLocales.lista }));

import i18n, { cambiarIdioma } from '@/i18n';

import { borrarMisDatos } from '../borrar-datos';
import { estadoNovena } from '../novenas';
import { desplazamientoDe, otraOracion } from '../otra-oracion';
import * as Pref from '../preferencias';
import * as Prog from '../progreso';
import { activarRecordatorios, recordatoriosActivos } from '../recordatorios';
import { paisInicial } from '../region';
import { PALETA_POR_DEFECTO } from '@/theme/paletas';

const mockNotificaciones = jest.requireMock('expo-notifications') as {
  cancelAllScheduledNotificationsAsync: jest.Mock;
};
const esperar = () => new Promise((r) => setTimeout(r, 0));
const Storage = jest.requireMock('expo-sqlite/kv-store').default as {
  setItemAsync: jest.Mock;
  clearAsync: jest.Mock;
};

/** Una persona que usó la app un tiempo: todo lleno. */
async function usarLaApp() {
  Pref.guardarPaleta('vitral');
  Pref.guardarPreferenciaHora('night');
  Pref.guardarPreferenciaAnimaciones('reducidas');
  Pref.guardarPais('US');
  Pref.guardarBienvenidaCompleta();
  Pref.guardarLetraLector(23);
  Pref.guardarHoraRecordatorio({ h: 21, m: 0 });
  Pref.guardarUltimaAperturaVitral('2026-10-05');
  await cambiarIdioma('en');
  await Prog.encenderVela('ter', 2026, 1);
  await Prog.descubrirRasgo('pablo', 'light');
  await Prog.ganarMedalla('pablo', 5);
  await Prog.ganarMedallaColeccion('apo');
  const ahora = new Date(2026, 8, 1, 12);
  await activarRecordatorios({
    novena: 'ter',
    anio: 2026,
    estado: estadoNovena({ mes: 10, dia: 1 }, ahora),
    hora: { h: 21, m: 0 },
    textos: (dia) => ({ titulo: `T${dia}`, cuerpo: `C${dia}` }),
    ahora,
  });
  otraOracion('sad');
  otraOracion('sad');
  otraOracion('lonely');
  await esperar();
}

beforeEach(async () => {
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  for (const t of Object.keys(mockTablas)) mockTablas[t] = [];
  mockProgramados.clear();
  mockModuloNotificaciones = mockNotificaciones;
  mockLocales.lista = [{ languageCode: 'es', regionCode: 'CL', languageTag: 'es-CL' }];
  jest.clearAllMocks();
});

describe('antes de borrar, la prueba parte con todo lleno', () => {
  test('preferencias, progreso, avisos, otra oración e idioma', async () => {
    await usarLaApp();
    expect(Pref.leerBienvenidaCompleta()).toBe(true);
    expect(Pref.leerIdioma(['es', 'en'] as const)).toBe('en');
    expect(i18n.language).toBe('en');
    expect(mockTablas.velas).toHaveLength(1);
    expect(mockTablas.rasgos).toHaveLength(1);
    expect(mockTablas.medallas).toHaveLength(1);
    expect(mockTablas.medallas_coleccion).toHaveLength(1);
    expect(mockProgramados.size).toBe(9);
    expect(recordatoriosActivos()).toHaveLength(1);
    expect(desplazamientoDe('sad')).toBe(2);
  });
});

describe('borrarMisDatos: como recién instalada', () => {
  beforeEach(async () => {
    await usarLaApp();
    await borrarMisDatos();
    await esperar();
  });

  test('tablas de progreso vacías (velas, rasgos, medallas, medallas_coleccion), esquema intacto', async () => {
    expect(Object.keys(mockTablas).sort()).toEqual(['medallas', 'medallas_coleccion', 'rasgos', 'velas']);
    for (const t of Object.values(mockTablas)) expect(t).toEqual([]);
    expect(mockSQL.version).toBe(Prog.MIGRACIONES.length);
    expect(await Prog.medallas()).toEqual([]);
    expect(await Prog.todosLosRasgos()).toEqual({});
  });

  test('kv-store vacío', () => {
    expect(Storage.clearAsync).toHaveBeenCalledTimes(1);
    expect(mockKV).toEqual({});
  });

  test('las preferencias vuelven a su valor por defecto', () => {
    expect(Pref.leerBienvenidaCompleta()).toBe(false);
    expect(Pref.leerPais()).toBeNull();
    expect(paisInicial()).toBe('CL'); // vuelve a mandar la región del teléfono
    expect(Pref.leerPaleta()).toBe(PALETA_POR_DEFECTO);
    expect(Pref.leerPreferenciaHora()).toBe('auto');
    expect(Pref.leerPreferenciaAnimaciones()).toBe('sistema');
    expect(Pref.leerLetraLector()).toBe(17);
    expect(Pref.leerHoraRecordatorio()).toEqual({ h: 8, m: 0 });
    expect(Pref.leerUltimaAperturaVitral()).toBeNull();
    expect(Pref.leerIdioma(['es', 'en'] as const)).toBeNull();
  });

  test('avisos cancelados y ningún recordatorio activo', () => {
    expect(mockNotificaciones.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mockProgramados.size).toBe(0);
    expect(recordatoriosActivos()).toEqual([]);
  });

  test('"Otra oración" vuelve a 0 en todas las emociones', () => {
    expect(desplazamientoDe('sad')).toBe(0);
    expect(desplazamientoDe('lonely')).toBe(0);
  });

  test('idioma = el del teléfono (es) y NO queda guardado', () => {
    expect(i18n.language).toBe('es');
    expect(mockKV['preferencias.idioma']).toBeUndefined();
    const despuesDeBorrar = Storage.setItemAsync.mock.invocationCallOrder.filter(
      (n) => n > Storage.clearAsync.mock.invocationCallOrder[0],
    );
    expect(despuesDeBorrar).toEqual([]);
  });
});

describe('borrarMisDatos: casos borde', () => {
  test('sin módulo de notificaciones (null) no falla y borra lo demás', async () => {
    await usarLaApp();
    mockModuloNotificaciones = null;
    await expect(borrarMisDatos()).resolves.toBeUndefined();
    expect(mockKV).toEqual({});
    expect(mockTablas.velas).toEqual([]);
    expect(i18n.language).toBe('es');
  });

  test('si cancelar los avisos falla, igual borra todo', async () => {
    await usarLaApp();
    mockNotificaciones.cancelAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error('sin permiso'));
    await expect(borrarMisDatos()).resolves.toBeUndefined();
    expect(mockKV).toEqual({});
    expect(mockTablas.medallas).toEqual([]);
  });

  test('cancela los avisos ANTES de vaciar kv-store (si no, quedarían sonando sin registro)', async () => {
    await usarLaApp();
    await borrarMisDatos();
    const cancelar = mockNotificaciones.cancelAllScheduledNotificationsAsync.mock.invocationCallOrder[0];
    const limpiar = Storage.clearAsync.mock.invocationCallOrder[0];
    expect(cancelar).toBeLessThan(limpiar);
  });

  test('teléfono en un idioma no soportado (fr) → inglés, sin guardarlo', async () => {
    await usarLaApp();
    await cambiarIdioma('es');
    mockLocales.lista = [{ languageCode: 'fr', regionCode: 'FR', languageTag: 'fr-FR' }];
    await borrarMisDatos();
    await esperar();
    expect(i18n.language).toBe('en');
    expect(mockKV).toEqual({});
    expect(paisInicial()).toBe('FR');
  });

  test('borrar dos veces seguidas (o sin datos) no falla', async () => {
    await borrarMisDatos();
    await expect(borrarMisDatos()).resolves.toBeUndefined();
    expect(mockKV).toEqual({});
  });

  test('no toca la red: solo SQL de borrado sobre la base local', async () => {
    await usarLaApp();
    mockSQL.consultas = [];
    await borrarMisDatos();
    expect(mockSQL.consultas.filter((q) => !/^SELECT name FROM sqlite_master/.test(q))).toEqual(
      expect.arrayContaining(['DELETE FROM velas', 'DELETE FROM rasgos', 'DELETE FROM medallas', 'DELETE FROM medallas_coleccion']),
    );
    expect(mockSQL.consultas.filter((q) => /DROP|PRAGMA user_version =/i.test(q))).toEqual([]);
  });
});
