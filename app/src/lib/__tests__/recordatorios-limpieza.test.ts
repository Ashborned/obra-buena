/// <reference types="jest" />
/*
 * Limpieza de recordatorios de años anteriores (`olvidarRecordatoriosPasados`): solo borra claves
 * `recordatorios.<novena>.<año>` con año menor; nunca otras preferencias ni el año en curso.
 */
const mockKV: Record<string, string> = {};
let mockFallaClaves = false;
jest.mock('expo-sqlite/kv-store', () => {
  const Storage = {
    getItemSync: (k: string) => (k in mockKV ? mockKV[k] : null),
    getAllKeysSync: () => {
      if (mockFallaClaves) throw new Error('kv no disponible');
      return Object.keys(mockKV);
    },
    removeItemSync: (k: string) => delete mockKV[k],
  };
  return { __esModule: true, default: Storage, Storage };
});
jest.mock('expo-notifications', () => ({}));

import { olvidarRecordatoriosPasados, recordatoriosActivos } from '../recordatorios';

const guardado = JSON.stringify({ hora: { h: 8, m: 0 }, ids: ['x'] });

beforeEach(() => {
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  mockFallaClaves = false;
});

test('borra solo los recordatorios de años anteriores', () => {
  Object.assign(mockKV, {
    'recordatorios.teresita.2025': guardado,
    'recordatorios.bruno.2024': guardado,
    'recordatorios.teresita.2026': guardado,
    'recordatorios.epifania.2027': guardado,
    'preferencias.paleta': 'vitral',
  });
  olvidarRecordatoriosPasados(2026);
  expect(Object.keys(mockKV).sort()).toEqual([
    'preferencias.paleta',
    'recordatorios.epifania.2027',
    'recordatorios.teresita.2026',
  ]);
  expect(recordatoriosActivos().map((r) => `${r.novena}.${r.anio}`)).toEqual(['teresita.2026', 'epifania.2027']);
});

test('sin almacenamiento disponible no lanza', () => {
  mockFallaClaves = true;
  expect(() => olvidarRecordatoriosPasados(2026)).not.toThrow();
});
