/// <reference types="jest" />
/*
 * Recordatorios de novena: plan puro (también en 6 zonas con npm run test:tz)
 * y activar / desactivar con expo-notifications y kv-store mockeados.
 */
import { Platform } from 'react-native';

import { diasEntre, estadoNovena, type Fiesta } from '../novenas';
import {
  activarRecordatorios,
  desactivarRecordatorios,
  HORA_POR_DEFECTO,
  planRecordatorios,
  recordatorioActivo,
  recordatoriosActivos,
} from '../recordatorios';

// --- Mocks -----------------------------------------------------------------------------------

const mockKV: Record<string, string> = {};
let mockFallaClaves = false;
jest.mock('expo-sqlite/kv-store', () => {
  const Storage = {
    getItemSync: (k: string) => (k in mockKV ? mockKV[k] : null),
    getAllKeysSync: () => {
      if (mockFallaClaves) throw new Error('kv no disponible');
      return Object.keys(mockKV);
    },
    setItemAsync: jest.fn(async (k: string, v: string) => {
      mockKV[k] = v;
    }),
    removeItemAsync: jest.fn(async (k: string) => {
      delete mockKV[k];
    }),
  };
  return { __esModule: true, default: Storage, Storage };
});

let mockSiguienteId = 0;
const mockProgramados = new Map<string, unknown>();
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async (req: unknown) => {
    const id = `id-${++mockSiguienteId}`;
    mockProgramados.set(id, req);
    return id;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockProgramados.delete(id);
  }),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

import * as Notifications from 'expo-notifications';

const N = Notifications as unknown as Record<string, jest.Mock>;

const permiso = (granted: boolean, canAskAgain = true) => ({ granted, canAskAgain, status: granted ? 'granted' : 'denied' });

// --- Utilidades ------------------------------------------------------------------------------

const d = (a: number, m: number, dia: number, h = 0, min = 0) => new Date(a, m - 1, dia, h, min);
const ymd = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

const ter: Fiesta = { mes: 10, dia: 1 }; // novena 22–30 sep
const textos = (dia: number) => ({ titulo: `T${dia}`, cuerpo: `C${dia}` });

beforeEach(() => {
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  mockProgramados.clear();
  mockSiguienteId = 0;
  mockFallaClaves = false;
  jest.clearAllMocks();
  N.getPermissionsAsync.mockResolvedValue(permiso(true));
  N.requestPermissionsAsync.mockResolvedValue(permiso(true));
});

// --- Plan puro -------------------------------------------------------------------------------

describe('planRecordatorios', () => {
  test('hora por defecto 08:00', () => {
    expect(HORA_POR_DEFECTO).toEqual({ h: 8, m: 0 });
  });

  test('antes de empezar: 9 avisos, días 1–9, a las 08:00', () => {
    const ahora = d(2026, 9, 1, 12);
    const plan = planRecordatorios(estadoNovena(ter, ahora), HORA_POR_DEFECTO, ahora);
    expect(plan.map((a) => a.dia)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(plan.map((a) => ymd(a.fecha))).toEqual([22, 23, 24, 25, 26, 27, 28, 29, 30].map((x) => `2026-09-${x}`));
    for (const a of plan) expect([a.fecha.getHours(), a.fecha.getMinutes()]).toEqual([8, 0]);
  });

  test('otra hora (21:45)', () => {
    const ahora = d(2026, 9, 1);
    const plan = planRecordatorios(estadoNovena(ter, ahora), { h: 21, m: 45 }, ahora);
    expect(plan).toHaveLength(9);
    for (const a of plan) expect([a.fecha.getHours(), a.fecha.getMinutes()]).toEqual([21, 45]);
  });

  test('día 3 antes de la hora → días 3–9; después → 4–9; justo a la hora → 4–9', () => {
    const e = estadoNovena(ter, d(2026, 9, 24));
    expect(e.dia).toBe(3);
    expect(planRecordatorios(e, HORA_POR_DEFECTO, d(2026, 9, 24, 7, 59)).map((a) => a.dia)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(planRecordatorios(e, HORA_POR_DEFECTO, d(2026, 9, 24, 8, 1)).map((a) => a.dia)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(planRecordatorios(e, HORA_POR_DEFECTO, d(2026, 9, 24, 8, 0)).map((a) => a.dia)).toEqual([4, 5, 6, 7, 8, 9]);
  });

  test('día 9 después de la hora → 0; el día de la fiesta → 0', () => {
    const ahora9 = d(2026, 9, 30, 9);
    expect(planRecordatorios(estadoNovena(ter, ahora9), HORA_POR_DEFECTO, ahora9)).toEqual([]);
    const fiesta = d(2026, 10, 1, 6);
    const e = estadoNovena(ter, fiesta);
    expect(e.esFiesta).toBe(true);
    expect(planRecordatorios(e, HORA_POR_DEFECTO, fiesta)).toEqual([]);
  });

  // Novenas que cruzan cambios de hora en las zonas de test:tz (Madrid, Nueva York, Santiago, Auckland).
  const cruces: [string, Fiesta][] = [
    ['NY inicio DST 8 mar 2026', { fecha: { anio: 2026, mes: 3, dia: 12 } }],
    ['Madrid inicio DST 29 mar 2026', { fecha: { anio: 2026, mes: 4, dia: 2 } }],
    ['Santiago/Auckland fin DST 5 abr 2026', { fecha: { anio: 2026, mes: 4, dia: 9 } }],
    ['Santiago inicio DST 6 sep 2026', { fecha: { anio: 2026, mes: 9, dia: 10 } }],
    ['Auckland inicio DST 27 sep 2026', { fecha: { anio: 2026, mes: 9, dia: 30 } }],
    ['Madrid fin DST 25 oct 2026', { fecha: { anio: 2026, mes: 10, dia: 28 } }],
    ['NY fin DST 1 nov 2026', { fecha: { anio: 2026, mes: 11, dia: 4 } }],
  ];
  test.each(cruces)('%s: cada aviso a la hora local exacta, un día civil tras otro', (_n, fiesta) => {
    for (const hora of [HORA_POR_DEFECTO, { h: 21, m: 30 }, { h: 6, m: 5 }]) {
      const ahora = d(2026, 1, 1);
      const e = estadoNovena(fiesta, ahora);
      const plan = planRecordatorios(e, hora, ahora);
      expect(plan).toHaveLength(9);
      plan.forEach((a, i) => {
        expect([a.fecha.getHours(), a.fecha.getMinutes()]).toEqual([hora.h, hora.m]);
        expect(diasEntre(e.inicio, a.fecha)).toBe(i);
      });
    }
  });
});

// --- Activar / desactivar ----------------------------------------------------------------------

describe('activarRecordatorios / desactivarRecordatorios / recordatorioActivo', () => {
  const ahora = d(2026, 9, 1, 12);
  const opciones = (extra: Partial<Parameters<typeof activarRecordatorios>[0]> = {}) => ({
    novena: 'ter',
    anio: 2026,
    estado: estadoNovena(ter, ahora),
    hora: HORA_POR_DEFECTO,
    textos,
    ahora,
    ...extra,
  });

  test('permiso ya concedido: no lo pide; programa 9 avisos con trigger DATE y guarda ids y hora', async () => {
    const r = await activarRecordatorios(opciones());
    expect(r).toEqual({ ok: true, programados: 9 });
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(9);
    const primera = N.scheduleNotificationAsync.mock.calls[0][0];
    expect(primera.trigger.type).toBe('date');
    expect(ymd(primera.trigger.date)).toBe('2026-09-22');
    expect(primera.trigger.date.getHours()).toBe(8);
    expect(primera.content).toEqual({ title: 'T1', body: 'C1', data: { novena: 'ter', dia: 1 } });
    const guardado = JSON.parse(mockKV['recordatorios.ter.2026']);
    expect(guardado).toEqual({ hora: { h: 8, m: 0 }, ids: ['id-1', 'id-2', 'id-3', 'id-4', 'id-5', 'id-6', 'id-7', 'id-8', 'id-9'] });
    expect(recordatorioActivo('ter', 2026)).toEqual({ h: 8, m: 0 });
  });

  test('sin permiso y se puede pedir: lo pide una vez; si concede, programa', async () => {
    N.getPermissionsAsync.mockResolvedValue(permiso(false, true));
    N.requestPermissionsAsync.mockResolvedValue(permiso(true));
    const r = await activarRecordatorios(opciones());
    expect(N.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ ok: true, programados: 9 });
  });

  test('se niega: sin-permiso, no programa ni guarda nada', async () => {
    N.getPermissionsAsync.mockResolvedValue(permiso(false, true));
    N.requestPermissionsAsync.mockResolvedValue(permiso(false, false));
    const r = await activarRecordatorios(opciones());
    expect(r).toEqual({ ok: false, motivo: 'sin-permiso' });
    expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mockKV).toEqual({});
    expect(recordatorioActivo('ter', 2026)).toBeNull();
  });

  test('negado sin poder volver a pedir: no llama a requestPermissionsAsync', async () => {
    N.getPermissionsAsync.mockResolvedValue(permiso(false, false));
    const r = await activarRecordatorios(opciones());
    expect(r).toEqual({ ok: false, motivo: 'sin-permiso' });
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('a mitad de novena programa solo los días que faltan', async () => {
    const ahora2 = d(2026, 9, 24, 9);
    const r = await activarRecordatorios(opciones({ estado: estadoNovena(ter, ahora2), ahora: ahora2 }));
    expect(r).toEqual({ ok: true, programados: 6 });
  });

  test('desactivar cancela exactamente esos ids y borra lo guardado', async () => {
    await activarRecordatorios(opciones());
    await activarRecordatorios(opciones({ novena: 'bru', estado: estadoNovena({ mes: 10, dia: 6 }, ahora) }));
    expect(mockProgramados.size).toBe(18);
    jest.clearAllMocks();
    await desactivarRecordatorios('ter', 2026);
    const cancelados = N.cancelScheduledNotificationAsync.mock.calls.map((c) => c[0]).sort();
    expect(cancelados).toEqual(['id-1', 'id-2', 'id-3', 'id-4', 'id-5', 'id-6', 'id-7', 'id-8', 'id-9'].sort());
    expect(mockKV['recordatorios.ter.2026']).toBeUndefined();
    expect(recordatorioActivo('ter', 2026)).toBeNull();
    expect(recordatorioActivo('bru', 2026)).toEqual({ h: 8, m: 0 });
    expect(mockProgramados.size).toBe(9);
  });

  test('activar dos veces no duplica: cancela los anteriores y guarda la nueva hora', async () => {
    await activarRecordatorios(opciones());
    await activarRecordatorios(opciones({ hora: { h: 20, m: 0 } }));
    expect(mockProgramados.size).toBe(9);
    expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(9);
    expect(recordatorioActivo('ter', 2026)).toEqual({ h: 20, m: 0 });
    expect(JSON.parse(mockKV['recordatorios.ter.2026']).ids).toEqual(
      ['id-10', 'id-11', 'id-12', 'id-13', 'id-14', 'id-15', 'id-16', 'id-17', 'id-18'],
    );
  });

  test('la clave es por novena y año: 2027 no ve lo de 2026', async () => {
    await activarRecordatorios(opciones());
    expect(recordatorioActivo('ter', 2027)).toBeNull();
    await desactivarRecordatorios('ter', 2027);
    expect(mockProgramados.size).toBe(9);
  });

  test('desactivar sin nada guardado no falla ni cancela nada', async () => {
    await expect(desactivarRecordatorios('nada', 2026)).resolves.toBeUndefined();
    expect(N.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  test('recordatorioActivo con valor corrupto devuelve null', () => {
    mockKV['recordatorios.ter.2026'] = '{no es json';
    expect(recordatorioActivo('ter', 2026)).toBeNull();
  });

  test('Android: crea el canal "novenas" antes de programar; iOS no', async () => {
    await activarRecordatorios(opciones());
    expect(N.setNotificationChannelAsync).not.toHaveBeenCalled();
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
    try {
      await activarRecordatorios(opciones({ canal: 'Novenas (es)' }));
      expect(N.setNotificationChannelAsync).toHaveBeenCalledWith('novenas', expect.objectContaining({ name: 'Novenas (es)' }));
      expect(N.scheduleNotificationAsync.mock.calls.at(-1)[0].trigger.channelId).toBe('novenas');
    } finally {
      Object.defineProperty(Platform, 'OS', { get: () => original, configurable: true });
    }
  });

  test('sin días por delante no programa ni guarda nada (el interruptor no queda "activo")', async () => {
    const tarde = d(2026, 9, 30, 9);
    const r = await activarRecordatorios(opciones({ estado: estadoNovena(ter, tarde), ahora: tarde }));
    expect(r).toEqual({ ok: true, programados: 0 });
    expect(recordatorioActivo('ter', 2026)).toBeNull();
  });
});

// --- Configuración: lista de recordatorios activos (hito 7) --------------------------------------

describe('recordatoriosActivos (Configuración)', () => {
  const ahora = d(2026, 9, 1, 12);
  const opciones = (extra: Partial<Parameters<typeof activarRecordatorios>[0]> = {}) => ({
    novena: 'ter',
    anio: 2026,
    estado: estadoNovena(ter, ahora),
    hora: HORA_POR_DEFECTO,
    textos,
    ahora,
    ...extra,
  });

  test('sin nada guardado → lista vacía', () => {
    expect(recordatoriosActivos()).toEqual([]);
  });

  test('activar programa N avisos y aparece en la lista con su hora', async () => {
    const r = await activarRecordatorios(opciones({ hora: { h: 21, m: 30 } }));
    expect(r).toEqual({ ok: true, programados: 9 });
    expect(mockProgramados.size).toBe(9);
    expect(recordatoriosActivos()).toEqual([{ novena: 'ter', anio: 2026, hora: { h: 21, m: 30 } }]);
  });

  test('a mitad de novena: N = días que faltan, y aparece igual', async () => {
    const ahora2 = d(2026, 9, 24, 9);
    const r = await activarRecordatorios(opciones({ estado: estadoNovena(ter, ahora2), ahora: ahora2 }));
    expect(r).toEqual({ ok: true, programados: 6 });
    expect(mockProgramados.size).toBe(6);
    expect(recordatoriosActivos()).toHaveLength(1);
  });

  test('desactivar cancela esos ids y desaparece de la lista; los demás siguen', async () => {
    await activarRecordatorios(opciones());
    await activarRecordatorios(opciones({ novena: 'bru', estado: estadoNovena({ mes: 10, dia: 6 }, ahora) }));
    expect(recordatoriosActivos().map((a) => a.novena)).toEqual(['bru', 'ter']);
    const idsTer = JSON.parse(mockKV['recordatorios.ter.2026']).ids as string[];
    jest.clearAllMocks();
    await desactivarRecordatorios('ter', 2026);
    expect(N.cancelScheduledNotificationAsync.mock.calls.map((c) => c[0]).sort()).toEqual([...idsTer].sort());
    for (const id of idsTer) expect(mockProgramados.has(id)).toBe(false);
    expect(recordatoriosActivos()).toEqual([{ novena: 'bru', anio: 2026, hora: { h: 8, m: 0 } }]);
    await desactivarRecordatorios('bru', 2026);
    expect(recordatoriosActivos()).toEqual([]);
    expect(mockProgramados.size).toBe(0);
  });

  test('sin días por delante (programados: 0) no aparece en la lista', async () => {
    const tarde = d(2026, 9, 30, 9);
    await activarRecordatorios(opciones({ estado: estadoNovena(ter, tarde), ahora: tarde }));
    expect(recordatoriosActivos()).toEqual([]);
  });

  test('sin permiso no aparece en la lista', async () => {
    N.getPermissionsAsync.mockResolvedValue(permiso(false, false));
    await activarRecordatorios(opciones());
    expect(recordatoriosActivos()).toEqual([]);
  });

  test('ordenados por año y luego por novena', async () => {
    const hora = { h: 8, m: 0 };
    const guardado = JSON.stringify({ hora, ids: ['x'] });
    mockKV['recordatorios.ter.2027'] = guardado;
    mockKV['recordatorios.bru.2027'] = guardado;
    mockKV['recordatorios.ter.2026'] = guardado;
    mockKV['recordatorios.cc.2026'] = guardado;
    expect(recordatoriosActivos().map((a) => `${a.anio}.${a.novena}`)).toEqual([
      '2026.cc',
      '2026.ter',
      '2027.bru',
      '2027.ter',
    ]);
  });

  test('claves ajenas en kv-store se ignoran', () => {
    const ok = JSON.stringify({ hora: { h: 7, m: 15 }, ids: ['a'] });
    Object.assign(mockKV, {
      'preferencias.paleta': 'vitral',
      'preferencias.horaRecordatorio': '20:00',
      'preferencias.idioma': 'es',
      recordatorios: ok,
      'recordatorios.ter': ok,
      'recordatorios.ter.26': ok,
      'recordatorios.ter.2026.x': ok,
      'recordatorios..2026': ok,
      'otro.recordatorios.ter.2026': ok,
      'Recordatorios.ter.2026': ok,
      'recordatorios.ter.2026': ok,
    });
    expect(recordatoriosActivos()).toEqual([{ novena: 'ter', anio: 2026, hora: { h: 7, m: 15 } }]);
  });

  test('un valor corrupto o sin hora se omite sin romper la lista', () => {
    mockKV['recordatorios.ter.2026'] = '{no es json';
    mockKV['recordatorios.bru.2026'] = JSON.stringify({ ids: ['a'] });
    mockKV['recordatorios.cc.2026'] = JSON.stringify({ hora: { h: 9, m: 0 }, ids: ['b'] });
    expect(recordatoriosActivos()).toEqual([{ novena: 'cc', anio: 2026, hora: { h: 9, m: 0 } }]);
  });

  test('si el almacenamiento falla al listar → [] sin lanzar', () => {
    mockKV['recordatorios.ter.2026'] = JSON.stringify({ hora: { h: 8, m: 0 }, ids: [] });
    mockFallaClaves = true;
    expect(() => recordatoriosActivos()).not.toThrow();
    expect(recordatoriosActivos()).toEqual([]);
  });
});
