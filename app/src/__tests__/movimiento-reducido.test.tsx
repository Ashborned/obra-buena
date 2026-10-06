/// <reference types="jest" />
/*
 * Hito 8 · QA de movimiento (parte C), en la app montada con sus rutas reales:
 *
 * 1. Con "Reducir movimiento" del sistema **o** "Animaciones: Reducidas", todo queda en fundidos y
 *    expo-haptics no se llama nunca: Hoy (vitral con apertura, haz, halo e inclinación encendida,
 *    estrellas, velas pequeñas, brillo del botón), novena 9/9, aviso de rasgo, medalla acuñada,
 *    colección completa, vitrina y la capa de transiciones. Control: sin reducir, sí se anima y vibra.
 * 2. Pantallas de oración (Emociones, emoción, novena, lector, historia del santo): sin animaciones
 *    infinitas ni resortes aunque NO haya movimiento reducido.
 * 3. La apertura del vitral, una vez por día.
 *
 * Complementa movimiento-sistema.test.ts (estático) y animaciones-reducidas.test.tsx (solo
 * "Reducidas" en el aviso y la medalla); aquí se espía lo que de verdad se pide a Reanimated.
 */
import { cleanup, render, screen } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';
import { useEffect } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import datos from '../../../content/contenido.json';
import type { Contenido } from '@/contenido/tipos';
import es from '@/i18n/locales/es.json';

declare const __dirname: string;
const path = require('path') as { resolve: (...p: string[]) => string };

// --- Mocks -----------------------------------------------------------------------------------------

/** "Reducir movimiento" del teléfono. */
let mockSistema = false;
const mockKV: Record<string, string> = {
  'preferencias.bienvenida': '1',
  'preferencias.idioma': 'es',
  'preferencias.pais': 'CL',
};
const mockProgreso = {
  rasgos: [] as { lectura: string; rasgo: string }[],
  medallas: [] as { lectura: string; puntaje: number; ganadaEn: string }[],
  colecciones: [] as { coleccion: string; ganadaEn: string }[],
  velas: [] as number[],
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
  openDatabaseSync: () => ({
    execSync: () => {},
    runSync: () => ({ changes: 0, lastInsertRowId: 0 }),
    getFirstSync: () => null,
    getAllSync: () => [],
    withTransactionSync: (f: () => void) => f(),
  }),
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
  ganarMedallaColeccion: jest.fn(async (coleccion: string) => {
    mockProgreso.colecciones.push({ coleccion, ganadaEn: new Date().toISOString() });
  }),
  velasEncendidas: jest.fn(async () => [...mockProgreso.velas]),
  encenderVela: jest.fn(async () => {}),
  apagarVela: jest.fn(async () => {}),
  baseProgreso: jest.fn(),
  MIGRACIONES: [],
}));

// Vibración: si alguien llama a expo-haptics, queda anotado.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated/mock', () => {
  const real = jest.requireActual('react-native-reanimated/mock');
  return {
    ...real,
    useReducedMotion: () => mockSistema,
    ReducedMotionConfig: () => null,
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    withSpring: jest.fn(real.withSpring),
    withTiming: jest.fn(real.withTiming),
    withRepeat: jest.fn(real.withRepeat),
    withSequence: jest.fn(real.withSequence),
    useAnimatedSensor: jest.fn(real.useAnimatedSensor),
    // El mock de Reanimated no lo trae ("ADD ME IF NEEDED"): la capa de vuelo lo usa.
    useFrameCallback: jest.fn(() => ({ setActive: () => {}, isActive: false, callbackId: 0 })),
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
type Espia = jest.Mock;
const R = require('react-native-reanimated') as typeof import('react-native-reanimated') & {
  withSpring: Espia;
  withTiming: Espia;
  withRepeat: Espia;
  withSequence: Espia;
  useAnimatedSensor: Espia;
};
const Haptics = require('expo-haptics') as { impactAsync: Espia; notificationAsync: Espia; selectionAsync: Espia };
const { movimiento } = require('@/theme/movimiento') as typeof import('@/theme/movimiento');
const { AnimacionesProvider } = require('@/lib/animaciones') as typeof import('@/lib/animaciones');
const { ThemeProvider } = require('@/theme') as typeof import('@/theme');
const T = require('@/components/transiciones') as typeof import('@/components/transiciones');
const { vibrar } = require('@/lib/vibracion') as typeof import('@/lib/vibracion');
/* eslint-enable @typescript-eslint/no-require-imports */

const RAIZ_APP = path.resolve(__dirname, '../app');
const contenido = datos as unknown as Contenido;
const pablo = contenido.lecturas.find((l) => l.id === 'pablo')!;
const quiz = pablo.es.quiz;
const letras = es.aprender.letrasOpciones;
const opcion = (n: number, k: number) =>
  es.aprender.opcionAccesible.replace('{{letra}}', letras.charAt(k)).replace('{{texto}}', quiz[n].o[k]);

/**
 * Lo único que puede durar algo con movimiento reducido: fundidos. `apagarVela` es un fundido;
 * `novenaCompleta` con reducido es el brillo de la columna (opacidad, sin subir); `inclinacion` es la
 * vuelta de la luz a 0 cuando ya está en 0 (no mueve nada); 0 son "ticks" para avisar a JS.
 */
const DURACIONES_REDUCIDAS = new Set([
  0,
  movimiento.fundido,
  movimiento.apagarVela,
  movimiento.novenaCompleta,
  movimiento.inclinacion,
  movimiento.regresoMedalla,
]);

type Variante = 'sistema' | 'reducidas';
const VARIANTES: [string, Variante][] = [
  ['"Reducir movimiento" del sistema', 'sistema'],
  ['"Animaciones: Reducidas"', 'reducidas'],
];

function preparar(variante: Variante | 'control', extra: Record<string, string> = {}) {
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  Object.assign(mockKV, { 'preferencias.bienvenida': '1', 'preferencias.idioma': 'es', 'preferencias.pais': 'CL' });
  mockSistema = variante === 'sistema';
  if (variante === 'reducidas') mockKV['preferencias.animaciones'] = 'reducidas';
  Object.assign(mockKV, extra);
}

let anunciar: jest.SpyInstance;
beforeEach(() => {
  mockSistema = false;
  preparar('control');
  mockProgreso.rasgos = [];
  mockProgreso.medallas = [];
  mockProgreso.colecciones = [];
  mockProgreso.velas = [];
  jest.clearAllMocks();
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

async function abrir(url: string, ahora: Date) {
  jest.useFakeTimers({ now: ahora });
  const r = renderRouter(RAIZ_APP, { initialUrl: url });
  await (r as unknown as Promise<unknown>);
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  await flush();
  return { getPathname: () => r.getPathname() };
}

const vibraciones = () =>
  Haptics.impactAsync.mock.calls.length + Haptics.notificationAsync.mock.calls.length + Haptics.selectionAsync.mock.calls.length;
const duraciones = () =>
  R.withTiming.mock.calls.map((c) => (c[1] as { duration?: number } | undefined)?.duration ?? -1);
/** Entradas y salidas de Reanimated que hay ahora en pantalla (clases de animación de diseño). */
const animacionesDeDiseno = () =>
  screen.container
    .queryAll((n) => n.props.entering !== undefined || n.props.exiting !== undefined)
    .flatMap((n) => [n.props.entering, n.props.exiting])
    .filter(Boolean);

/** Todo lo que se pidió a Reanimated son fundidos (ni resortes, ni bucles, ni secuencias). */
function soloFundidos() {
  expect(R.withSpring).not.toHaveBeenCalled();
  expect(R.withRepeat).not.toHaveBeenCalled();
  expect(R.withSequence).not.toHaveBeenCalled();
  expect(duraciones().filter((d) => !DURACIONES_REDUCIDAS.has(d))).toEqual([]);
  for (const a of animacionesDeDiseno()) expect([R.FadeIn, R.FadeOut]).toContain(a);
}

const DIA_29 = new Date(2026, 8, 29, 22, 0); // martes 29 sep 2026, Completas: hay estrellas
const DIA_30 = new Date(2026, 8, 30, 10, 0); // día 9 de la novena de Santa Teresita (CL)

// --- 1. Movimiento reducido: solo fundidos y sin vibración ---------------------------------------

describe.each(VARIANTES)('%s → solo fundidos y sin vibración', (_n, variante) => {
  test('Hoy: vitral (apertura, haz, halo, inclinación), estrellas, velas pequeñas y brillo del botón', async () => {
    // Inclinación encendida en Configuración, cielo de Completas (estrellas) y primera apertura del día.
    preparar(variante, { 'preferencias.inclinacion': '1', 'preferencias.hora': 'night' });
    await abrir('/', DIA_29);
    expect(screen.getByRole('button', { name: es.hoy.comoTeSientes })).toBeTruthy();
    soloFundidos();
    expect(R.withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: movimiento.fundido }));
    expect(duraciones()).not.toContain(movimiento.aperturaVitral);
    // Sin sensor: la inclinación queda sin efecto con movimiento reducido.
    expect(R.useAnimatedSensor).not.toHaveBeenCalled();
    expect(vibraciones()).toBe(0);
  });

  test('novena: encender la novena vela (9/9) no rebota, no late, no lanza chispas ni vibra', async () => {
    preparar(variante);
    mockProgreso.velas = [1, 2, 3, 4, 5, 6, 7, 8];
    await abrir('/novena/ter', DIA_30);
    await medirVelas();
    R.withTiming.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: es.novenas.receHoy }));
    await drenar();
    await flush();
    expect(screen.getByRole('button', { name: es.novenas.rezadoAccesible.replace('{{n}}', '9') })).toBeTruthy();
    soloFundidos();
    expect(duraciones()).not.toContain(movimiento.encenderVela);
    expect(duraciones()).not.toContain(movimiento.chispasVela);
    expect(vibraciones()).toBe(0);
  });

  test('quiz aprobado con colección completa: medalla acuñada y colección en arco sin giro ni vibración', async () => {
    preparar(variante);
    // Las otras tres lecturas de "Apóstoles": aprobar a Pablo completa la colección.
    mockProgreso.medallas = ['pedro', 'andres', 'esteban'].map((lectura) => ({
      lectura,
      puntaje: 5,
      ganadaEn: '2026-09-01T12:00:00.000Z',
    }));
    await aprobarQuiz();
    await drenar();
    await flush();
    expect(screen.getByText(es.aprender.coleccionCompleta)).toBeTruthy();
    soloFundidos();
    expect(vibraciones()).toBe(0);
  });

  test('"Ver en mi vitrina" con reducido: no hay medalla volando; la vitrina la muestra sin asentarse', async () => {
    preparar(variante);
    await aprobarQuiz();
    await drenar();
    R.withTiming.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: es.aprender.verVitrina }));
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    await flush();
    expect(capasDeTransicion()).toHaveLength(0);
    soloFundidos();
    expect(vibraciones()).toBe(0);
  });

  test('lector: el aviso de rasgo entra con fundido y no vibra', async () => {
    preparar(variante);
    await abrir('/lectura/pablo', DIA_29);
    await medirLector([pablo.es.secs.find((s) => s.trait)!.h]);
    expect(screen.getByRole('button', { name: new RegExp(es.aprender.rasgoDescubierto.split('{{')[0]) })).toBeTruthy();
    soloFundidos();
    expect(vibraciones()).toBe(0);
  });

  test('capa de transiciones: ni la tarjeta ni la medalla se lanzan', async () => {
    preparar(variante);
    await montarCapa();
    expect(capasDeTransicion()).toHaveLength(0);
  });

  test('vibrar() con movimiento reducido no toca expo-haptics en ningún momento', () => {
    for (const m of ['vela', 'novenaCompleta', 'rasgo', 'medalla', 'coleccion', 'tope'] as const) vibrar(m, true);
    expect(vibraciones()).toBe(0);
  });
});

describe('control: sin movimiento reducido sí hay espectáculo y vibración', () => {
  test('Hoy: apertura del vitral, bucles de nivel 2 y sensor de inclinación (encendido)', async () => {
    preparar('control', { 'preferencias.inclinacion': '1', 'preferencias.hora': 'night' });
    await abrir('/', DIA_29);
    expect(duraciones()).toContain(movimiento.aperturaVitral);
    expect(R.withRepeat).toHaveBeenCalled();
    expect(R.useAnimatedSensor).toHaveBeenCalled();
    expect(vibraciones()).toBe(0); // Hoy no vibra nunca.
  });

  test('Hoy con la inclinación apagada (por defecto): no se monta el sensor', async () => {
    preparar('control');
    await abrir('/', DIA_29);
    expect(R.useAnimatedSensor).not.toHaveBeenCalled();
  });

  test('novena 9/9: la llama nace con rebote, laten las nueve y vibra dos veces (vela y completa)', async () => {
    preparar('control');
    mockProgreso.velas = [1, 2, 3, 4, 5, 6, 7, 8];
    await abrir('/novena/ter', DIA_30);
    await medirVelas();
    await fireEvent.press(screen.getByRole('button', { name: es.novenas.receHoy }));
    await drenar();
    await flush();
    expect(duraciones()).toContain(movimiento.encenderVela);
    expect(R.withSequence).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    // Aun así, nada infinito ni resortes en la pantalla de oración.
    expect(R.withRepeat).not.toHaveBeenCalled();
    expect(R.withSpring).not.toHaveBeenCalled();
  });

  test('quiz con colección completa: vibra la medalla y la colección', async () => {
    preparar('control');
    mockProgreso.medallas = ['pedro', 'andres', 'esteban'].map((lectura) => ({
      lectura,
      puntaje: 5,
      ganadaEn: '2026-09-01T12:00:00.000Z',
    }));
    await aprobarQuiz();
    await drenar();
    await flush();
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
  });

  test('lector: el rasgo vibra leve', async () => {
    preparar('control');
    await abrir('/lectura/pablo', DIA_29);
    await medirLector([pablo.es.secs.find((s) => s.trait)!.h]);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });
});

// --- 2. Pantallas de oración: sin infinitos ni resortes (con movimiento completo) ----------------

describe('pantallas de oración sin movimiento reducido: nada infinito ni resortes', () => {
  const emocion = contenido.emociones[0];
  test.each([
    ['Emociones', '/emociones'],
    ['detalle de emoción', `/emocion/${emocion.id}`],
    ['detalle de novena', '/novena/ter'],
    ['lector', '/lectura/pablo'],
    ['historia del santo', '/santo/09-29'],
  ])('%s', async (_n, url) => {
    preparar('control');
    mockProgreso.velas = [1, 2, 3];
    await abrir(url, DIA_29);
    expect(R.withRepeat).not.toHaveBeenCalled();
    expect(R.withSpring).not.toHaveBeenCalled();
    expect(R.useAnimatedSensor).not.toHaveBeenCalled();
    // Lo que se lee entra con fundido + subida (entradaCalma) o fundido: nunca desde un costado.
    for (const a of animacionesDeDiseno()) expect([R.FadeIn, R.FadeOut, R.FadeInDown]).toContain(a);
  });

  test('"Otra oración" en una emoción: fundido cruzado, sin moverse', async () => {
    preparar('control');
    await abrir(`/emocion/${emocion.id}`, DIA_29);
    const otra = screen.queryByRole('button', { name: new RegExp(es.emociones.otraOracion, 'i') });
    if (!otra) return; // Emoción con una sola oración.
    R.withTiming.mockClear();
    await fireEvent.press(otra);
    await flush();
    expect(R.withRepeat).not.toHaveBeenCalled();
    expect(R.withSpring).not.toHaveBeenCalled();
    for (const a of animacionesDeDiseno()) expect([R.FadeIn, R.FadeOut, R.FadeInDown]).toContain(a);
  });
});

// --- 3. Apertura del vitral, una vez por día ----------------------------------------------------

describe('apertura del vitral: una vez por día', () => {
  const abrioHoy = () => duraciones().includes(movimiento.aperturaVitral);

  test('primera apertura del día anima y guarda; la segunda no; al día siguiente vuelve a animar', async () => {
    preparar('control');
    await abrir('/', DIA_29);
    expect(abrioHoy()).toBe(true);
    expect(mockKV['preferencias.aperturaVitral']).toBe('2026-09-29');
    await act(async () => cleanup());

    R.withTiming.mockClear();
    await abrir('/', new Date(2026, 8, 29, 23, 59));
    expect(screen.getByRole('button', { name: es.hoy.comoTeSientes })).toBeTruthy();
    expect(abrioHoy()).toBe(false);
    await act(async () => cleanup());

    R.withTiming.mockClear();
    await abrir('/', new Date(2026, 8, 30, 0, 1));
    expect(screen.getByRole('button', { name: es.hoy.comoTeSientes })).toBeTruthy();
    expect(abrioHoy()).toBe(true);
    expect(mockKV['preferencias.aperturaVitral']).toBe('2026-09-30');
  });

  test('Hoy abierta al pasar la medianoche: el día nuevo no queda anotado sin haber visto su apertura', async () => {
    preparar('control');
    await abrir('/', new Date(2026, 8, 29, 23, 59, 30));
    expect(abrioHoy()).toBe(true);
    // La app sigue abierta (o en segundo plano) y el reloj cruza la medianoche: Hoy cambia de día.
    await act(async () => {
      jest.advanceTimersByTime(2 * 60_000);
    });
    await flush();
    expect(new Date().getDate()).toBe(30);
    expect(mockKV['preferencias.aperturaVitral']).toBe('2026-09-29');
    await act(async () => cleanup());

    // La mañana siguiente: la primera apertura de ese día sí arma el vitral.
    R.withTiming.mockClear();
    await abrir('/', new Date(2026, 8, 30, 8, 0));
    expect(abrioHoy()).toBe(true);
    expect(mockKV['preferencias.aperturaVitral']).toBe('2026-09-30');
  });

  test('el día es el local (medianoche del teléfono), no el UTC', async () => {
    preparar('control');
    // 23:30 local: en zonas al oeste de UTC ya es "mañana" en UTC; se guarda el día local.
    await abrir('/', new Date(2026, 8, 29, 23, 30));
    expect(mockKV['preferencias.aperturaVitral']).toBe('2026-09-29');
  });

  test('con movimiento reducido también se anota el día (y solo hay un fundido)', async () => {
    preparar('sistema');
    await abrir('/', DIA_29);
    expect(mockKV['preferencias.aperturaVitral']).toBe('2026-09-29');
    expect(abrioHoy()).toBe(false);
  });
});

// --- 6. Capa de transiciones: nunca bloquea toques ni queda pegada ---------------------------------

describe('capa de transiciones (sin movimiento reducido)', () => {
  test('la tarjeta que se expande no recibe toques, es invisible al lector y desaparece al terminar', async () => {
    preparar('control');
    let vistas = 0;
    await montarCapa({
      alAnimar: () => {
        // Durante la animación (antes del callback final) la hoja existe y no bloquea toques.
        const capas = capasDeTransicion();
        vistas = capas.length;
        capas.forEach((c) => {
          expect(c.props.pointerEvents).toBe('none');
          expect(c.props.importantForAccessibility).toBe('no-hide-descendants');
        });
      },
      lanzar: 'tarjeta',
    });
    expect(vistas).toBe(1);
    // Con los callbacks de fin cumplidos, la capa se fue sola.
    expect(capasDeTransicion()).toHaveLength(0);
  });

  test('si la vitrina nunca aparece, la medalla en vuelo se desvanece y no queda pegada', async () => {
    preparar('control');
    let vistas = 0;
    await montarCapa({
      alAnimar: () => {
        const capas = capasDeTransicion();
        vistas = capas.length;
        capas.forEach((c) => expect(c.props.pointerEvents).toBe('none'));
      },
      lanzar: 'medalla',
    });
    expect(vistas).toBe(1);
    expect(capasDeTransicion()).toHaveLength(0);
    expect(screen.getByTestId('medalla-en-vuelo').props.children).toBe('null');
  });
});

// --- Utilidades de escenario ---------------------------------------------------------------------

/** Vistas de la capa de transiciones: absolutas, sin toques y ocultas al lector. */
function capasDeTransicion() {
  return screen.container.queryAll(
    (n) =>
      n.type === 'View' &&
      n.props.pointerEvents === 'none' &&
      n.props.accessibilityElementsHidden === true &&
      n.props.importantForAccessibility === 'no-hide-descendants' &&
      /"position":"absolute"/.test(JSON.stringify(n.props.style ?? '')) &&
      n.parent?.parent?.props?.testID === 'raiz-transiciones',
  );
}

/**
 * Monta solo el proveedor de transiciones y lanza una tarjeta o una medalla. Con el mock de
 * Reanimated los callbacks de fin corren al instante: si la capa no se quita sola, queda pegada.
 * `alAnimar` mira la capa entre el lanzamiento y el final (se congela el final con un withTiming
 * que no llama su callback la primera vez).
 */
async function montarCapa(op: { alAnimar?: () => void; lanzar?: 'tarjeta' | 'medalla' } = {}) {
  const origen = { x: 20, y: 300, ancho: 120, alto: 150 };
  let lanzar: () => void = () => {};
  function Sonda() {
    const tr = T.useTransiciones();
    const enVuelo = T.useMedallaEnVuelo();
    useEffect(() => {
      lanzar = () =>
        op.lanzar === 'medalla'
          ? tr.lanzarMedalla({ id: 'pablo', origen, medalla: <View /> })
          : tr.expandirTarjeta(origen);
    });
    return <Text testID="medalla-en-vuelo">{String(enVuelo)}</Text>;
  }
  await render(
    <View testID="raiz-transiciones">
      <ThemeProvider>
        <AnimacionesProvider>
          <T.TransicionesProvider>
            <Sonda />
          </T.TransicionesProvider>
        </AnimacionesProvider>
      </ThemeProvider>
    </View>,
  );
  // Mientras corre la animación, los withTiming no terminan: se guardan sus callbacks de fin.
  const real = R.withTiming.getMockImplementation()!;
  const pendientes: ((fin: boolean) => void)[] = [];
  R.withTiming.mockImplementation((v: unknown, _c: unknown, cb?: (fin: boolean) => void) => {
    if (cb) pendientes.push(cb);
    return v;
  });
  try {
    await act(async () => {
      lanzar();
    });
    op.alAnimar?.();
  } finally {
    R.withTiming.mockImplementation(real);
  }
  // Terminan (los fundidos de salida que piden estos callbacks terminan al instante).
  await act(async () => {
    pendientes.splice(0).forEach((cb) => cb(true));
  });
  await flush();
}

async function aprobarQuiz() {
  await abrir('/quiz/pablo', DIA_29);
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

type Nodo = ReturnType<typeof screen.container.queryAll>[number];
function esAncestro(a: Nodo, b: Nodo): boolean {
  for (let p = b.parent; p; p = p.parent) if (p === a) return true;
  return false;
}

/** Simula el layout del lector (mismo método que aprender-interfaz.test.tsx). */
async function medirLector(visibles: string[], alto = 800) {
  const hosts = screen.container.queryAll((n) => typeof n.props.onLayout === 'function');
  const contiene = (n: Nodo, titulo: string) =>
    n.queryAll((x) => x.type === 'Text' && x.children.some((ch) => ch === titulo)).length > 0;
  const masProfundo = (cands: Nodo[]) => cands.find((c) => !cands.some((o) => o !== c && esAncestro(c, o)));
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

/** Corre lo que Reanimated deja para JS (`scheduleOnRN` → microtareas) y los temporizadores. */
async function drenar() {
  await act(async () => {
    jest.runAllTicks();
    jest.runOnlyPendingTimers();
  });
  await flush();
}

/** Las velas grandes se dibujan al conocer su ancho (onLayout del grupo). */
async function medirVelas() {
  const grupo = screen.getByLabelText(es.novenas.velasGrupo);
  await act(async () => {
    grupo.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 260 } } });
  });
  await flush();
  expect(screen.getAllByRole('radio').length).toBe(9);
}

describe('cambio de pestaña sin redibujar de más', () => {
  test('mismoProgreso: igual con los mismos datos (Maps nuevos), distinto si cambia una medalla o un rasgo', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mismoProgreso } = require('@/lib/aprender-progreso') as typeof import('@/lib/aprender-progreso');
    const p = () => ({
      medallas: new Map([['pablo', '2026-09-01T12:00:00.000Z']]),
      rasgos: { pablo: ['light'] } as Record<string, string[]>,
      colecciones: new Map<string, string>(),
    });
    expect(mismoProgreso(p(), p())).toBe(true);
    const otra = p();
    otra.medallas.set('pedro', '2026-09-02T12:00:00.000Z');
    expect(mismoProgreso(p(), otra)).toBe(false);
    const rasgo = p();
    rasgo.rasgos.pablo.push('road');
    expect(mismoProgreso(p(), rasgo)).toBe(false);
  });
});
