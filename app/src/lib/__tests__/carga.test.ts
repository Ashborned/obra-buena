/// <reference types="jest" />
/*
 * Hito 11 · Pantalla de carga: se desvanece con la duración de calma; con movimiento reducido
 * (sistema o "Reducidas" en Configuración) se corta sin fundido. En Expo Go solo se oculta.
 */
// jest.mock se eleva sobre los import (babel-jest): los módulos de abajo ya ven los simulados.
import { movimiento } from '@/theme/movimiento';

import { ocultarPantallaCarga, opcionesSalidaCarga } from '../carga';

const mockKV: Record<string, string> = {};
const mockSetOptions = jest.fn();
const mockHide = jest.fn();
let mockExpoGo = false;

jest.mock('expo-sqlite/kv-store', () => {
  const Storage = {
    getItemSync: (k: string) => (k in mockKV ? mockKV[k] : null),
    setItemAsync: async (k: string, v: string) => {
      mockKV[k] = v;
    },
  };
  return { __esModule: true, default: Storage, Storage };
});
jest.mock('expo-splash-screen', () => ({
  setOptions: (o: unknown) => mockSetOptions(o),
  hide: () => mockHide(),
}));
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('expo', () => ({ isRunningInExpoGo: () => mockExpoGo }));


beforeEach(() => {
  mockSetOptions.mockClear();
  mockHide.mockClear();
  mockExpoGo = false;
  for (const k of Object.keys(mockKV)) delete mockKV[k];
});

describe('pantalla de carga', () => {
  it('con movimiento completo, fundido de salidaCarga', () => {
    expect(opcionesSalidaCarga(false)).toEqual({ duration: movimiento.salidaCarga, fade: true });
  });

  it('con movimiento reducido, corte directo', () => {
    expect(opcionesSalidaCarga(true)).toEqual({ duration: 0, fade: false });
  });

  it('sin reducir en el sistema ni en Configuración: funde y oculta', () => {
    ocultarPantallaCarga(false);
    expect(mockSetOptions).toHaveBeenCalledWith({ duration: movimiento.salidaCarga, fade: true });
    expect(mockHide).toHaveBeenCalledTimes(1);
  });

  it('el sistema pide reducir movimiento: corte directo', () => {
    ocultarPantallaCarga(true);
    expect(mockSetOptions).toHaveBeenCalledWith({ duration: 0, fade: false });
    expect(mockHide).toHaveBeenCalledTimes(1);
  });

  it('"Reducidas" guardado en Configuración: corte directo aunque el sistema no lo pida', () => {
    mockKV['preferencias.animaciones'] = 'reducidas';
    ocultarPantallaCarga(false);
    expect(mockSetOptions).toHaveBeenCalledWith({ duration: 0, fade: false });
  });

  it('el setOptions va antes de ocultar', () => {
    ocultarPantallaCarga(false);
    expect(mockSetOptions.mock.invocationCallOrder[0]).toBeLessThan(mockHide.mock.invocationCallOrder[0]);
  });

  it('en Expo Go solo oculta (no hay splash propio)', () => {
    mockExpoGo = true;
    ocultarPantallaCarga(false);
    expect(mockSetOptions).not.toHaveBeenCalled();
    expect(mockHide).toHaveBeenCalledTimes(1);
  });
});
