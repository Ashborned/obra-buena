/// <reference types="jest" />
/*
 * Hito 7 · Configuración → Animaciones "Reducidas" (punto 7 del pedido de QA, parte C ronda 2).
 *
 * Con "Reducidas" guardada y el teléfono SIN "Reducir movimiento", `useReducirMovimiento()` debe ser
 * true en las pantallas con animación: el aviso de rasgo del lector y la medalla acuñada del quiz
 * usan solo fundido. Con "Según el sistema" (control) se animan normal.
 *
 * Mocks como aprender-interfaz.test.tsx: progreso en memoria, Reanimated con `useReducedMotion`
 * controlable (el "sistema") y espías en withTiming/withSpring; Skia como Views con testID.
 * AvisoRasgo y MedallaAcunada se envuelven en espías para leer el `reducir` que les pasa la pantalla.
 */
import { render, screen } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import type { TestInstance } from 'test-renderer';

import datos from '../../../content/contenido.json';
import type { Contenido } from '@/contenido/tipos';
import es from '@/i18n/locales/es.json';

declare const __dirname: string;
const path = require('path') as { resolve: (...p: string[]) => string };

// --- Mocks -----------------------------------------------------------------------------------------

/** "Reducir movimiento" del teléfono. */
let mockSistema = false;
// Con valores desde ya: i18n lee el idioma guardado al cargarse (lo importan los módulos espiados).
const mockKV: Record<string, string> = {
  'preferencias.bienvenida': '1',
  'preferencias.idioma': 'es',
  'preferencias.pais': 'CL',
};
const mockProgreso = {
  rasgos: [] as { lectura: string; rasgo: string }[],
  medallas: [] as { lectura: string; puntaje: number; ganadaEn: string }[],
  colecciones: [] as { coleccion: string; ganadaEn: string }[],
};

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
  openDatabaseAsync: async () => ({
    execAsync: async () => {},
    runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
    withTransactionAsync: async (f: () => Promise<void>) => f(),
  }),
}));

jest.mock('@/lib/progreso', () => ({
  rasgosDescubiertos: jest.fn(async (lectura: string) =>
    mockProgreso.rasgos.filter((r) => r.lectura === lectura).map((r) => r.rasgo),
  ),
  todosLosRasgos: jest.fn(async () => {
    const r: Record<string, string[]> = {};
    for (const x of mockProgreso.rasgos) (r[x.lectura] ??= []).push(x.rasgo);
    return r;
  }),
  descubrirRasgo: jest.fn(async (lectura: string, rasgo: string) => {
    if (mockProgreso.rasgos.some((r) => r.lectura === lectura && r.rasgo === rasgo)) return false;
    mockProgreso.rasgos.push({ lectura, rasgo });
    return true;
  }),
  medallas: jest.fn(async () => mockProgreso.medallas.map((m) => ({ ...m }))),
  ganarMedalla: jest.fn(async (lectura: string, puntaje: number) => {
    if (!mockProgreso.medallas.some((x) => x.lectura === lectura))
      mockProgreso.medallas.push({ lectura, puntaje, ganadaEn: new Date().toISOString() });
  }),
  medallasColeccion: jest.fn(async () => mockProgreso.colecciones.map((c) => ({ ...c }))),
  ganarMedallaColeccion: jest.fn(async () => {}),
  velasEncendidas: jest.fn(async () => []),
  encenderVela: jest.fn(async () => {}),
  apagarVela: jest.fn(async () => {}),
  baseProgreso: jest.fn(),
  MIGRACIONES: [],
}));

// Espías que dejan ver el `reducir` que recibe cada componente animado desde su pantalla.
jest.mock('@/components/aviso-rasgo', () => {
  const React = require('react');
  const real = jest.requireActual('@/components/aviso-rasgo');
  return { ...real, AvisoRasgo: jest.fn((p: object) => React.createElement(real.AvisoRasgo, p)) };
});
jest.mock('@/components/acunacion', () => {
  const React = require('react');
  const real = jest.requireActual('@/components/acunacion');
  return { ...real, MedallaAcunada: jest.fn((p: object) => React.createElement(real.MedallaAcunada, p)) };
});

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
const mockReducedMotionConfig = jest.fn((_p: { mode: string }) => null);
jest.mock('react-native-reanimated/mock', () => {
  const real = jest.requireActual('react-native-reanimated/mock');
  return {
    ...real,
    useReducedMotion: () => mockSistema,
    ReducedMotionConfig: (p: { mode: string }) => mockReducedMotionConfig(p),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    withSpring: jest.fn(real.withSpring),
    withTiming: jest.fn(real.withTiming),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const real = jest.requireActual('react-native-gesture-handler');
  const React = require('react');
  const { View: V } = require('react-native');
  const pan = () => {
    const b: Record<string, (f: never) => unknown> = {};
    b.onChange = () => b;
    b.onFinalize = () => b;
    return b;
  };
  return {
    ...real,
    Gesture: { ...real.Gesture, Pan: pan },
    GestureDetector: ({ children }: { children: unknown }) => children,
    GestureHandlerRootView: ({ children, style }: { children: unknown; style: unknown }) =>
      React.createElement(V, { style }, children),
  };
});

jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View: V } = require('react-native');
  const cache: Record<string, unknown> = {};
  const componente = (nombre: string) => {
    if (!cache[nombre]) {
      const C = ({ children }: { children?: unknown }) => React.createElement(V, { testID: `skia-${nombre}` }, children);
      C.displayName = `Skia${nombre}`;
      cache[nombre] = C;
    }
    return cache[nombre];
  };
  const ruido = () => ({});
  const Skia = new Proxy({}, { get: () => new Proxy(() => ({}), { get: () => ruido, apply: () => ({}) }) });
  return new Proxy({ __esModule: true, Skia } as Record<string, unknown>, {
    get: (obj, k: string) => {
      if (k in obj) return obj[k];
      if (/^use[A-Z]/.test(k)) return () => ({ value: 0, current: null });
      if (/^[A-Z]/.test(k)) return componente(k);
      return ruido;
    },
  });
});

// --- Utilidades ------------------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-require-imports */
const Reanimated = require('react-native-reanimated') as typeof import('react-native-reanimated') & {
  withSpring: jest.Mock;
  withTiming: jest.Mock;
};
const { AvisoRasgo } = require('@/components/aviso-rasgo') as { AvisoRasgo: jest.Mock };
const { MedallaAcunada } = require('@/components/acunacion') as { MedallaAcunada: jest.Mock };
const { AnimacionesProvider, useReducirMovimiento } = require('@/lib/animaciones') as typeof import('@/lib/animaciones');
const { movimiento } = require('@/theme/movimiento') as typeof import('@/theme/movimiento');
/* eslint-enable @typescript-eslint/no-require-imports */

const RAIZ_APP = path.resolve(__dirname, '../app');
const contenido = datos as unknown as Contenido;
const pablo = contenido.lecturas.find((l) => l.id === 'pablo')!;
const quiz = pablo.es.quiz;
const letras = es.aprender.letrasOpciones;
const opcion = (n: number, k: number) =>
  es.aprender.opcionAccesible.replace('{{letra}}', letras.charAt(k)).replace('{{texto}}', quiz[n].o[k]);
const plano = (s: unknown) => (StyleSheet.flatten(s as never) ?? {}) as Record<string, unknown>;

let anunciar: jest.SpyInstance;

function preferencia(p: 'sistema' | 'reducidas' | null) {
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  Object.assign(mockKV, { 'preferencias.bienvenida': '1', 'preferencias.idioma': 'es', 'preferencias.pais': 'CL' });
  if (p) mockKV['preferencias.animaciones'] = p;
}

beforeEach(() => {
  mockSistema = false;
  preferencia(null);
  mockProgreso.rasgos = [];
  mockProgreso.medallas = [];
  mockProgreso.colecciones = [];
  Reanimated.withSpring.mockClear();
  Reanimated.withTiming.mockClear();
  AvisoRasgo.mockClear();
  MedallaAcunada.mockClear();
  mockReducedMotionConfig.mockClear();
  anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});

afterEach(() => {
  anunciar.mockRestore();
  jest.useRealTimers();
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function abrir(url: string) {
  jest.useFakeTimers({ now: new Date(2026, 9, 5, 10, 0) });
  const r = renderRouter(RAIZ_APP, { initialUrl: url });
  await (r as unknown as Promise<unknown>);
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  await flush();
}

function esAncestro(a: TestInstance, b: TestInstance): boolean {
  for (let p = b.parent; p; p = p.parent) if (p === a) return true;
  return false;
}

/** Simula el layout del lector (mismo método que aprender-interfaz.test.tsx). */
async function medirLector(visibles: string[], alto = 800) {
  const hosts = screen.container.queryAll((n) => typeof n.props.onLayout === 'function');
  const contiene = (n: TestInstance, titulo: string) =>
    n.queryAll((x) => x.type === 'Text' && x.children.some((ch) => ch === titulo)).length > 0;
  const masProfundo = (cands: TestInstance[]) => cands.find((c) => !cands.some((o) => o !== c && esAncestro(c, o)));
  const ev = (y: number, height: number) => ({ nativeEvent: { layout: { x: 0, y, width: 390, height } } });
  const titulos = pablo.es.secs.map((s) => s.h);
  const scroll = hosts.find((n) => n.props.scrollEventThrottle === 16)!;
  const cuerpo = masProfundo(hosts.filter((n) => n !== scroll && titulos.every((t) => contiene(n, t))))!;
  const secciones = titulos.map((t) => masProfundo(hosts.filter((n) => contiene(n, t)))!);
  await act(async () => {
    scroll.props.onLayout(ev(0, alto));
    cuerpo.props.onLayout(ev(0, 5000));
    titulos.forEach((t, i) => secciones[i].props.onLayout(ev(visibles.includes(t) ? 0 : 10_000 + i * 1000, 100)));
  });
  await flush();
  await flush();
}

const tituloDe = (rasgo: string) => pablo.es.secs.find((s) => s.trait === rasgo)!.h;
const ultimoReducir = (m: jest.Mock) => m.mock.calls[m.mock.calls.length - 1]?.[0]?.reducir;

async function aprobarQuiz() {
  await abrir('/quiz/pablo');
  for (let n = 0; n < quiz.length; n++) {
    await fireEvent.press(screen.getByRole('button', { name: opcion(n, quiz[n].a) }));
    await flush();
    await fireEvent.press(
      screen.getByRole('button', { name: n === quiz.length - 1 ? es.aprender.verResultado : es.aprender.siguiente }),
    );
    await flush();
  }
  await flush();
  expect(screen.getByText(es.aprender.ganaste)).toBeTruthy();
}

// --- Pruebas ---------------------------------------------------------------------------------------

describe('useReducirMovimiento: sistema O preferencia', () => {
  function Sonda() {
    return <Text testID="sonda">{String(useReducirMovimiento())}</Text>;
  }
  const valor = () => screen.getByTestId('sonda').props.children;

  test.each([
    [false, null, 'false'],
    [false, 'sistema', 'false'],
    [false, 'reducidas', 'true'],
    [true, 'sistema', 'true'],
    [true, 'reducidas', 'true'],
  ] as const)('sistema=%s, preferencia=%s → %s', async (sistema, pref, esperado) => {
    mockSistema = sistema;
    preferencia(pref);
    await render(
      <AnimacionesProvider>
        <Sonda />
      </AnimacionesProvider>,
    );
    expect(valor()).toBe(esperado);
    // ReducedMotionConfig en Always solo con "Reducidas".
    if (pref === 'reducidas') expect(mockReducedMotionConfig).toHaveBeenCalledWith({ mode: 'always' });
    else expect(mockReducedMotionConfig).not.toHaveBeenCalled();
  });
});

describe('aviso de rasgo en el lector', () => {
  const entrada = () => {
    const capa = screen.container.queryAll(
      (n) => n.props.entering !== undefined && n.queryAll((x) => x.props.accessibilityHint === es.aprender.cerrarAviso).length > 0,
    );
    return capa[capa.length - 1].props;
  };

  test('"Reducidas" con el teléfono sin Reducir movimiento → solo fundido', async () => {
    preferencia('reducidas');
    const springify = jest.spyOn(Reanimated.SlideInRight, 'springify');
    try {
      await abrir('/lectura/pablo');
      await medirLector([tituloDe('light')]);
      expect(AvisoRasgo).toHaveBeenCalled();
      expect(ultimoReducir(AvisoRasgo)).toBe(true);
      expect(entrada().entering).toBe(Reanimated.FadeIn);
      expect(entrada().exiting).toBe(Reanimated.FadeOut);
      expect(springify).not.toHaveBeenCalled();
      expect(Reanimated.withSpring).not.toHaveBeenCalled();
    } finally {
      springify.mockRestore();
    }
  });

  test('control: "Según el sistema" (teléfono sin reducir) → entra desde el costado', async () => {
    preferencia('sistema');
    await abrir('/lectura/pablo');
    await medirLector([tituloDe('light')]);
    expect(ultimoReducir(AvisoRasgo)).toBe(false);
    expect(entrada().entering).toBe(Reanimated.SlideInRight);
  });
});

describe('medalla acuñada en el resultado del quiz', () => {
  const conGiro3D = () =>
    screen.container.queryAll((n) => /rotateY/.test(JSON.stringify(plano(n.props.style).transform ?? ''))).length;
  const llamadasRayos = () =>
    Reanimated.withTiming.mock.calls.filter((c) => c[1]?.duration === movimiento.rayosMedalla).length;

  test('"Reducidas" con el teléfono sin Reducir movimiento → sin giro 3D ni rayos girando; solo fundido', async () => {
    preferencia('reducidas');
    await aprobarQuiz();
    expect(MedallaAcunada).toHaveBeenCalled();
    expect(ultimoReducir(MedallaAcunada)).toBe(true);
    expect(conGiro3D()).toBe(0);
    expect(llamadasRayos()).toBe(0);
    expect(Reanimated.withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: movimiento.fundido }));
  });

  test('control: "Según el sistema" → giro 3D y rayos', async () => {
    preferencia('sistema');
    await aprobarQuiz();
    expect(ultimoReducir(MedallaAcunada)).toBe(false);
    expect(conGiro3D()).toBeGreaterThan(0);
    expect(llamadasRayos()).toBeGreaterThan(0);
  });
});
