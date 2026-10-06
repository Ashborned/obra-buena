/// <reference types="jest" />
/*
 * Tamaño de letra del lector de Aprender guardado en el teléfono (expo-sqlite/kv-store simulado,
 * misma forma que recordatorios.test.ts): 15–23, pasos de 2, por defecto 17.
 */
import { cambiarLetraLector, LETRA_LECTOR } from '../aprender';
import { guardarLetraLector, leerLetraLector } from '../preferencias';

const CLAVE = 'preferencias.letraLector';
const mockKV: Record<string, string> = {};
let mockFallaLectura = false;

jest.mock('expo-sqlite/kv-store', () => {
  const Storage = {
    getItemSync: (k: string) => {
      if (mockFallaLectura) throw new Error('kv no disponible');
      return k in mockKV ? mockKV[k] : null;
    },
    setItemAsync: jest.fn(async (k: string, v: string) => {
      mockKV[k] = v;
    }),
  };
  return { __esModule: true, default: Storage, Storage };
});

beforeEach(() => {
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  mockFallaLectura = false;
});

const esperar = () => Promise.resolve();

describe('leerLetraLector', () => {
  test('sin valor guardado → 17', () => {
    expect(leerLetraLector()).toBe(LETRA_LECTOR.porDefecto);
    expect(leerLetraLector()).toBe(17);
  });

  test.each(['abc', '', '1e1', '17.5', '-17', ' 17', '9', '170', 'NaN'])('valor guardado inválido %p → 17', (v) => {
    mockKV[CLAVE] = v;
    expect(leerLetraLector()).toBe(17);
  });

  test.each([
    ['10', 15],
    ['99', 23],
    ['15', 15],
    ['23', 23],
    ['19', 19],
  ])('valor guardado %p fuera de rango se acota → %p', (v, n) => {
    mockKV[CLAVE] = v;
    expect(leerLetraLector()).toBe(n);
  });

  test('si el almacenamiento falla al leer → 17, sin lanzar', () => {
    mockFallaLectura = true;
    expect(() => leerLetraLector()).not.toThrow();
    expect(leerLetraLector()).toBe(17);
  });
});

describe('guardarLetraLector', () => {
  test('guardar y leer de vuelta cada tamaño de la escala', async () => {
    for (const n of [15, 17, 19, 21, 23]) {
      guardarLetraLector(n);
      await esperar();
      expect(mockKV[CLAVE]).toBe(String(n));
      expect(leerLetraLector()).toBe(n);
    }
  });

  test('guarda el valor ya acotado (99 → 23, 3 → 15, NaN → 17)', async () => {
    guardarLetraLector(99);
    await esperar();
    expect(leerLetraLector()).toBe(23);
    guardarLetraLector(3);
    await esperar();
    expect(mockKV[CLAVE]).toBe('15');
    guardarLetraLector(NaN);
    await esperar();
    expect(mockKV[CLAVE]).toBe('17');
  });

  test('el flujo de la pantalla (A+ dos veces) sobrevive a "reabrir" la app', async () => {
    let n = leerLetraLector();
    n = cambiarLetraLector(n, 1);
    n = cambiarLetraLector(n, 1);
    guardarLetraLector(n);
    await esperar();
    expect(leerLetraLector()).toBe(21);
  });
});
