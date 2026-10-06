/// <reference types="jest" />
/*
 * Hito 7 · Interfaz de Configuración con renderRouter (mocks como en navegacion-novenas.test.tsx):
 * secciones con encabezado, hora de oración y animaciones, lista de recordatorios con interruptor,
 * confirmación propia de "Borrar mis datos", aportes simulados y marcadores de Acerca de.
 */
import { screen } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';

import datos from '../../../content/contenido.json';
import type { Contenido } from '@/contenido/tipos';
import es from '@/i18n/locales/es.json';

declare const __dirname: string;
const path = require('path') as { resolve: (...p: string[]) => string };

const mockGuardado: Record<string, string> = {};
function mockInicial() {
  for (const k of Object.keys(mockGuardado)) delete mockGuardado[k];
  Object.assign(mockGuardado, {
    'preferencias.bienvenida': '1',
    'preferencias.idioma': 'es',
    'preferencias.pais': 'CL',
  });
}
mockInicial();

jest.mock('expo-sqlite/kv-store', () => {
  const leer = (k: string) => (k in mockGuardado ? mockGuardado[k] : null);
  const escribir = (k: string, v: string) => {
    mockGuardado[k] = v;
  };
  const quitar = async (k: string) => {
    delete mockGuardado[k];
  };
  const Storage = {
    getItemSync: leer,
    setItemSync: escribir,
    getAllKeysSync: () => Object.keys(mockGuardado),
    getItem: async (k: string) => leer(k),
    getItemAsync: async (k: string) => leer(k),
    setItem: async (k: string, v: string) => escribir(k, v),
    setItemAsync: async (k: string, v: string) => escribir(k, v),
    removeItem: quitar,
    removeItemAsync: quitar,
    clearAsync: async () => {
      for (const k of Object.keys(mockGuardado)) delete mockGuardado[k];
    },
  };
  return { __esModule: true, default: Storage, Storage };
});

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => ({
    execSync: () => {},
    runSync: () => ({ changes: 0, lastInsertRowId: 0 }),
    getFirstSync: () => null,
    getAllSync: () => [],
    withTransactionSync: (f: () => void) => f(),
    execAsync: async () => {},
    runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
    withTransactionAsync: async (f: () => Promise<void>) => f(),
  }),
}));

let mockSiguienteId = 0;
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: () => null,
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async () => `id-${++mockSiguienteId}`),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

// "Borrar mis datos": se controla si falla; si no, vacía el almacenamiento simulado.
let mockBorrarFalla = false;
jest.mock('@/lib/borrar-datos', () => ({
  borrarMisDatos: jest.fn(async () => {
    if (mockBorrarFalla) throw new Error('falla simulada');
    for (const k of Object.keys(mockGuardado)) delete mockGuardado[k];
  }),
}));

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated/mock', () => {
  const real = jest.requireActual('react-native-reanimated/mock');
  // El simulado de Reanimated no trae ReducedMotionConfig (lo monta "Reducidas").
  return { ...real, useReducedMotion: () => false, ReducedMotionConfig: () => null };
});

jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Componente = ({ children }: { children?: unknown }) => React.createElement(View, null, children);
  const ruido = () => ({});
  const Skia = new Proxy({}, { get: () => new Proxy(() => ({}), { get: () => ruido, apply: () => ({}) }) });
  return new Proxy({ __esModule: true, Skia, Canvas: Componente } as Record<string, unknown>, {
    get: (obj, k: string) => {
      if (k in obj) return obj[k];
      if (/^use[A-Z]/.test(k)) return () => ({ value: 0, current: null });
      if (/^[A-Z]/.test(k)) return Componente;
      return ruido;
    },
  });
});

const RAIZ_APP = path.resolve(__dirname, '../app');
const contenido = datos as unknown as Contenido;
const c = es.configuracion;

async function abrir(fecha = new Date(2026, 8, 29, 10, 0)) {
  jest.useFakeTimers({ now: fecha });
  const r = renderRouter(RAIZ_APP, { initialUrl: '/configuracion' });
  await (r as unknown as Promise<unknown>);
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  return { getPathname: () => r.getPathname() };
}

async function esperar() {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
}

afterEach(() => {
  jest.useRealTimers();
  mockBorrarFalla = false;
  mockInicial();
});

describe('Configuración', () => {
  test('seis secciones, cada una con su encabezado', async () => {
    await abrir();
    for (const titulo of Object.values(c.secciones)) {
      expect(screen.getByRole('header', { name: titulo })).toBeTruthy();
    }
  });

  test('hora de oración y animaciones son grupos de radio que se guardan', async () => {
    await abrir();
    await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${c.horas.night}\\.`) }));
    expect(screen.getByRole('radio', { name: new RegExp(`^${c.horas.night}\\.`) }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(mockGuardado['preferencias.hora']).toBe('night');

    const reducidas = () => screen.getByRole('radio', { name: new RegExp(`^${c.animacionesOpciones.reducidas}\\.`) });
    expect(reducidas().props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(reducidas());
    expect(reducidas().props.accessibilityState).toMatchObject({ checked: true });
    expect(mockGuardado['preferencias.animaciones']).toBe('reducidas');
  });

  test('sin recordatorios: lo dice y explica dónde activarlos', async () => {
    await abrir();
    expect(screen.getByText(c.recordatorios.ninguno)).toBeTruthy();
  });

  test('un recordatorio activo tiene interruptor; apagarlo cancela y encenderlo reprograma', async () => {
    mockGuardado['recordatorios.ter.2026'] = JSON.stringify({ hora: { h: 8, m: 0 }, ids: ['id-a'] });
    // Un aviso de una novena ya terminada no aparece.
    mockGuardado['recordatorios.cc.2026'] = JSON.stringify({ hora: { h: 8, m: 0 }, ids: ['id-b'] });
    await abrir();
    const nombre = contenido.novenas.find((n) => n.id === 'ter')!.es;
    const interruptor = () =>
      screen.getByRole('switch', { name: c.recordatorios.interruptor.replace('{{nombre}}', nombre) });
    expect(interruptor().props.accessibilityState).toMatchObject({ checked: true });
    const nombreCc = contenido.novenas.find((n) => n.id === 'cc')!.es;
    expect(screen.queryByRole('switch', { name: c.recordatorios.interruptor.replace('{{nombre}}', nombreCc) })).toBeNull();

    await fireEvent.press(interruptor());
    await esperar();
    expect(interruptor().props.accessibilityState).toMatchObject({ checked: false });
    expect(mockGuardado['recordatorios.ter.2026']).toBeUndefined();

    await fireEvent.press(interruptor());
    await esperar();
    expect(interruptor().props.accessibilityState).toMatchObject({ checked: true });
    expect(JSON.parse(mockGuardado['recordatorios.ter.2026']).hora).toEqual({ h: 8, m: 0 });
  });

  test('Borrar mis datos: confirmación propia; Cancelar no borra; si falla, avisa y no reinicia', async () => {
    const r = await abrir();
    await fireEvent.press(screen.getByRole('button', { name: c.privacidad.borrar }));
    expect(screen.getByRole('header', { name: c.borrado.titulo })).toBeTruthy();
    expect(screen.getByText(c.borrado.advertencia)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: c.borrado.cancelar }));
    expect(screen.queryByRole('header', { name: c.borrado.titulo })).toBeNull();
    expect(mockGuardado['preferencias.bienvenida']).toBe('1');

    mockBorrarFalla = true;
    await fireEvent.press(screen.getByRole('button', { name: c.privacidad.borrar }));
    await fireEvent.press(screen.getByRole('button', { name: c.borrado.confirmar }));
    await esperar();
    expect(screen.getByText(c.borrado.error)).toBeTruthy();
    expect(r.getPathname()).toBe('/configuracion');
  });

  test('Borrar todo: vuelve a montar la app y aparece la bienvenida', async () => {
    const r = await abrir();
    await fireEvent.press(screen.getByRole('button', { name: c.privacidad.borrar }));
    await fireEvent.press(screen.getByRole('button', { name: c.borrado.confirmar }));
    await esperar();
    expect(r.getPathname()).toBe('/bienvenida');
  });

  test('Apoyar la app: aportes simulados marcados, gracias sencillo y nada se guarda', async () => {
    await abrir();
    const antes = { ...mockGuardado };
    expect(screen.getByText(c.apoyo.simulada)).toBeTruthy();
    const boton = screen.getByRole('button', {
      name: c.apoyo.botonAporte.replace('{{nombre}}', c.apoyo.aportes.apoyo_pequeno).replace('{{precio}}', c.apoyo.montoPorDefinir),
    });
    await fireEvent.press(boton);
    await esperar();
    expect(screen.getByText(c.apoyo.gracias)).toBeTruthy();
    expect(mockGuardado).toEqual(antes);
  });

  test('Acerca de: política y contacto son "Próximamente", no enlaces', async () => {
    await abrir();
    expect(screen.queryByRole('link', { name: new RegExp(c.acercaDe.privacidad) })).toBeNull();
    expect(screen.getByLabelText(`${c.acercaDe.privacidad}. ${c.acercaDe.proximamente}`)).toBeTruthy();
    expect(screen.getByLabelText(`${c.acercaDe.contacto}. ${c.acercaDe.proximamente}`)).toBeTruthy();
  });
});
