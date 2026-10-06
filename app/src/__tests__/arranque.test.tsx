/// <reference types="jest" />
/*
 * Hito 11 · Arranque con la app montada (renderRouter sobre las rutas reales de `src/app`).
 *
 * 1. Pantalla de carga: el fondo nativo de la ventana se iguala a `tema.cielo.fondo` ANTES de ocultar
 *    la pantalla de carga, para las 2 paletas × 3 horas, con el sistema en claro y en oscuro, y en la
 *    bienvenida. Con movimiento reducido (sistema o "Reducidas") el corte es directo. `carga.test.ts`
 *    prueba la función aislada; aquí se prueba el orden real de los efectos de `_layout.tsx`.
 * 2. Enlaces profundos con el scheme `soulshelter`: el router abre la ruta que trae el enlace.
 */
import { screen } from '@testing-library/react-native';
import { act, renderRouter } from 'expo-router/testing-library';
import { Appearance } from 'react-native';

import appJson from '../../app.json';
import type { PaletaId } from '@/theme/paletas';
import { resolverTema } from '@/theme/resolver';
import type { HoraOracion } from '@/lib/hora-oracion';
import { movimiento } from '@/theme/movimiento';

declare const __dirname: string;
const path = require('path') as { resolve: (...p: string[]) => string };

// --- Simulados -------------------------------------------------------------------------------------

/** Registro en orden de las llamadas nativas que importan al arranque. */
const mockLog: [string, unknown?][] = [];
const mockKV: Record<string, string> = {};
let mockSistemaReduce = false;

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: async () => true,
  setOptions: (o: unknown) => mockLog.push(['setOptions', o]),
  hide: () => mockLog.push(['hide']),
  hideAsync: async () => {
    mockLog.push(['hide']);
  },
}));
jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: async (c: unknown) => {
    mockLog.push(['fondo', c]);
  },
  getBackgroundColorAsync: async () => null,
}));
// Fuera de Expo Go (como en el APK): sí se configura el fundido.
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));

jest.mock('expo-sqlite/kv-store', () => {
  const leer = (k: string) => (k in mockKV ? mockKV[k] : null);
  const escribir = (k: string, v: string) => {
    mockKV[k] = v;
  };
  const Storage = {
    getItemSync: leer,
    setItemSync: escribir,
    getAllKeysSync: () => Object.keys(mockKV),
    getItem: async (k: string) => leer(k),
    getItemAsync: async (k: string) => leer(k),
    setItem: async (k: string, v: string) => escribir(k, v),
    setItemAsync: async (k: string, v: string) => escribir(k, v),
    removeItem: async (k: string) => {
      delete mockKV[k];
    },
    removeItemAsync: async (k: string) => {
      delete mockKV[k];
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
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated/mock', () => {
  const real = jest.requireActual('react-native-reanimated/mock');
  return {
    ...real,
    useReducedMotion: () => mockSistemaReduce,
    ReducedMotionConfig: () => null,
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  };
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

// --- Utilidades ------------------------------------------------------------------------------------

const RAIZ_APP = path.resolve(__dirname, '../app');
const PALETAS: PaletaId[] = ['rosaMistica', 'vitral'];
const HORAS: HoraOracion[] = ['day', 'dusk', 'night'];
const ESQUEMAS = ['light', 'dark'] as const;

function preparar(extra: Record<string, string> = {}, bienvenida = true) {
  mockLog.length = 0;
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  Object.assign(mockKV, { 'preferencias.idioma': 'es', 'preferencias.pais': 'CL' }, extra);
  if (bienvenida) mockKV['preferencias.bienvenida'] = '1';
}

async function montar(initialUrl = '/') {
  jest.useFakeTimers({ now: new Date(2026, 9, 1, 10, 0) });
  const r = renderRouter(RAIZ_APP, { initialUrl });
  await (r as unknown as Promise<unknown>);
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  return { getPathname: () => r.getPathname() };
}

/** Comprueba el orden: fondo = cielo → setOptions → hide, y que nunca se pinta otro color. */
function esperarArranque(fondoEsperado: string, opciones: { duration: number; fade: boolean }) {
  const iHide = mockLog.findIndex(([k]) => k === 'hide');
  expect(iHide).toBeGreaterThan(-1);
  const antes = mockLog.slice(0, iHide);
  const fondos = antes.filter(([k]) => k === 'fondo');
  expect(fondos.length).toBeGreaterThan(0);
  expect(fondos.at(-1)![1]).toBe(fondoEsperado);
  expect(mockLog[iHide - 1]).toEqual(['setOptions', opciones]);
  // Ningún otro color de ventana en todo el arranque (ni antes ni después de ocultar).
  for (const [k, v] of mockLog) if (k === 'fondo') expect(v).toBe(fondoEsperado);
}

const FUNDIDO = { duration: movimiento.salidaCarga, fade: true };
const CORTE = { duration: 0, fade: false };

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  mockSistemaReduce = false;
});

// --- 1. Pantalla de carga ------------------------------------------------------------------------

describe('pantalla de carga con la app montada', () => {
  const casos = PALETAS.flatMap((p) => HORAS.flatMap((h) => ESQUEMAS.map((e) => [p, h, e] as const)));

  it.each(casos)('%s · %s · sistema %s: fondo de la ventana = cielo antes de ocultar, con fundido', async (p, h, e) => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(e);
    preparar({ 'preferencias.paleta': p, 'preferencias.hora': h });
    await montar();
    // El cielo no depende del modo oscuro del sistema: solo de la paleta y la hora.
    esperarArranque(resolverTema(p, h).cielo.fondo, FUNDIDO);
  });

  it('hora automática (10:00 → Laudes): el fondo sigue al reloj', async () => {
    preparar({ 'preferencias.paleta': 'vitral' });
    await montar();
    esperarArranque(resolverTema('vitral', 'day').cielo.fondo, FUNDIDO);
  });

  it('primera vez (bienvenida sin completar): igual fondo = cielo antes de ocultar', async () => {
    preparar({ 'preferencias.hora': 'night' }, false);
    await montar();
    esperarArranque(resolverTema('rosaMistica', 'night').cielo.fondo, FUNDIDO);
  });

  it.each(HORAS)('"Reducir movimiento" del sistema (%s): corte directo, sin fundido', async (h) => {
    mockSistemaReduce = true;
    preparar({ 'preferencias.hora': h });
    await montar();
    esperarArranque(resolverTema('rosaMistica', h).cielo.fondo, CORTE);
  });

  it.each(PALETAS)('"Animaciones: Reducidas" (%s): corte directo aunque el sistema no lo pida', async (p) => {
    preparar({ 'preferencias.paleta': p, 'preferencias.hora': 'dusk', 'preferencias.animaciones': 'reducidas' });
    await montar();
    esperarArranque(resolverTema(p, 'dusk').cielo.fondo, CORTE);
  });

  it('se oculta una sola vez en el arranque', async () => {
    preparar({ 'preferencias.hora': 'day' });
    await montar();
    expect(mockLog.filter(([k]) => k === 'hide')).toHaveLength(1);
  });
});

// --- 2. Enlaces profundos ------------------------------------------------------------------------

/*
 * En el teléfono, Expo Router toma el enlace con que se abrió la app (getInitialURL nativo) y le saca
 * la ruta con `extractExpoPathFromURL` (expo-router/build/fork/extractPathFromURL.js; no mira el
 * scheme ni los prefijos). En Jest no hay ventana nativa (getInitialURL devuelve ''), así que se hace
 * el mismo paso a mano y se monta la ruta resultante.
 */
const { extractExpoPathFromURL } = require('expo-router/build/fork/extractPathFromURL') as {
  extractExpoPathFromURL: (prefijos: string[], url: string) => string;
};
const rutaDeEnlace = (enlace: string) => '/' + extractExpoPathFromURL([], enlace);

describe('enlaces profundos con el scheme de app.json', () => {
  it('app.json usa el scheme soulshelter', () => {
    expect(appJson.expo.scheme).toBe('soulshelter');
  });

  it('el router saca la ruta de soulshelter://', () => {
    expect(rutaDeEnlace('soulshelter://novena/bru')).toBe('/novena/bru');
    expect(rutaDeEnlace('soulshelter://emocion/tired')).toBe('/emocion/tired');
    expect(rutaDeEnlace('soulshelter:///novenas')).toBe('/novenas');
  });

  it.each([
    ['soulshelter://novena/bru', '/novena/bru'],
    ['soulshelter://emocion/tired', '/emocion/tired'],
    ['soulshelter://novenas', '/novenas'],
    ['soulshelter://configuracion', '/configuracion'],
  ])('abrir %s lleva a %s', async (enlace, ruta) => {
    preparar({ 'preferencias.hora': 'day' });
    const r = await montar(rutaDeEnlace(enlace));
    expect(r.getPathname()).toBe(ruta);
  });

  it('con la bienvenida sin completar, el enlace no salta la protección', async () => {
    preparar({}, false);
    const r = await montar(rutaDeEnlace('soulshelter://novena/bru'));
    expect(r.getPathname()).not.toBe('/novena/bru');
    expect(screen.toJSON()).toBeTruthy();
  });
});
