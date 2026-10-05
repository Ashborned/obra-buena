/// <reference types="jest" />
/*
 * Pestaña Novenas con renderRouter (mocks como en navegacion-hoy.test.tsx): grupos de la lista en
 * fechas fijas, fiestas que cambian según el país y que tocar una novena abre su detalle.
 */
import { screen, within } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';

import datos from '../../../content/contenido.json';
import type { Contenido } from '@/contenido/tipos';
import es from '@/i18n/locales/es.json';

// Sin @types/node en el proyecto (misma convención que region.test.ts).
declare const __dirname: string;
const path = require('path') as { resolve: (...p: string[]) => string };

// Bienvenida completa, idioma español; país variable por prueba.
let mockPais = 'CL';
jest.mock('expo-sqlite/kv-store', () => {
  const guardado: Record<string, string> = {
    'preferencias.bienvenida': '1',
    'preferencias.idioma': 'es',
  };
  const leer = (k: string) => (k === 'preferencias.pais' ? mockPais : k in guardado ? guardado[k] : null);
  const escribir = (k: string, v: string) => {
    if (k === 'preferencias.pais') mockPais = v;
    else guardado[k] = v;
  };
  const Storage = {
    getItemSync: leer,
    setItemSync: escribir,
    getItem: async (k: string) => leer(k),
    getItemAsync: async (k: string) => leer(k),
    setItem: async (k: string, v: string) => escribir(k, v),
    setItemAsync: async (k: string, v: string) => escribir(k, v),
    removeItem: async (k: string) => {
      delete guardado[k];
    },
    removeItemAsync: async (k: string) => {
      delete guardado[k];
    },
  };
  return { __esModule: true, default: Storage, Storage };
});

// Progreso (velas) en SQLite: sin base nativa en Jest.
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
  return { ...real, useReducedMotion: () => false };
});

jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

// Skia: los gráficos dibujados (velas) se reemplazan por View.
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
const nombre = (id: string) => contenido.novenas.find((n) => n.id === id)!.es;
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fila = (id: string) => ({ name: new RegExp(`^${escapar(nombre(id))}\\.`) });

async function abrir(url: string, fecha: Date) {
  jest.useFakeTimers({ now: fecha });
  const r = renderRouter(RAIZ_APP, { initialUrl: url });
  await (r as unknown as Promise<unknown>);
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  return { getPathname: () => r.getPathname() };
}

afterEach(() => {
  jest.useRealTimers();
  mockPais = 'CL';
});

describe('Novenas: lista y detalle', () => {
  test('Hoy con país CL: el 4 jun 2026 Corpus va en "Día 7 de 9" y la tarjeta abre su detalle', async () => {
    mockPais = 'CL';
    const r = await abrir('/', new Date(2026, 5, 4, 10, 0));
    const tarjeta = screen.getByRole('button', { name: new RegExp(`^${es.hoy.novenaDeHoy}`) });
    expect(tarjeta.props.accessibilityLabel).toContain(nombre('cc'));
    expect(tarjeta.props.accessibilityLabel).toContain(es.novenas.diaDe.replace('{{n}}', '7'));
    await fireEvent.press(tarjeta);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    expect(r.getPathname()).toBe('/novena/cc');
  });

  test('Hoy con país CL: el 7 jun 2026 Corpus dice "Hoy es su fiesta"', async () => {
    mockPais = 'CL';
    await abrir('/', new Date(2026, 5, 7, 10, 0));
    expect(screen.getByRole('button', { name: new RegExp(`^${es.novenas.esSuFiesta}\. ${nombre('cc')}`) })).toBeTruthy();
  });

  test('29 sep 2026 (CL): "En curso" Teresita (día 8) y Bruno (día 3); sin "Próximas"; el resto "Más adelante"', async () => {
    await abrir('/novenas', new Date(2026, 8, 29, 10, 0));
    const enCurso = within(screen.getByTestId('grupo-enCurso'));
    expect(enCurso.getByRole('button', fila('ter')).props.accessibilityLabel).toContain(
      es.novenas.diaDe.replace('{{n}}', '8'),
    );
    expect(enCurso.getByRole('button', fila('bru')).props.accessibilityLabel).toContain(
      es.novenas.diaDe.replace('{{n}}', '3'),
    );
    expect(screen.queryByTestId('grupo-proximas')).toBeNull();
    expect(screen.queryByText(es.novenas.grupos.proximas)).toBeNull();
    const despues = within(screen.getByTestId('grupo-masAdelante'));
    for (const id of ['cc', 'dom', 'mon', 'mat']) expect(despues.getByRole('button', fila(id))).toBeTruthy();
  });

  test('15 jul 2026: "Próximas" muestra Domingo y Mónica', async () => {
    await abrir('/novenas', new Date(2026, 6, 15, 10, 0));
    const proximas = within(screen.getByTestId('grupo-proximas'));
    expect(proximas.getByRole('button', fila('dom')).props.accessibilityLabel).toContain('En 15 días');
    expect(proximas.getByRole('button', fila('mon'))).toBeTruthy();
    expect(screen.queryByTestId('grupo-enCurso')).toBeNull();
  });

  test('tocar una novena abre /novena/[id] con su nombre y el día que toca', async () => {
    const r = await abrir('/novenas', new Date(2026, 8, 29, 10, 0));
    await fireEvent.press(screen.getByRole('button', fila('ter')));
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    expect(r.getPathname()).toBe('/novena/ter');
    expect(screen.getByRole('header', { name: nombre('ter') })).toBeTruthy();
    expect(screen.getByText(`${es.novenas.diaDe.replace('{{n}}', '8')}. ${es.novenas.tocaUnaVela}`)).toBeTruthy();
    // La vela de hoy dice su día, su estado y que es hoy (las velas se reparten al medir el ancho).
    const velas = screen.getByLabelText(es.novenas.velasGrupo);
    await fireEvent(velas, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 260 } } });
    expect(screen.getByRole('radio', { name: 'Día 8, apagada, hoy' })).toBeTruthy();
  });

  test('7 jun 2026 con país CL: Corpus (domingo) "Hoy es su fiesta"', async () => {
    mockPais = 'CL';
    await abrir('/novenas', new Date(2026, 5, 7, 10, 0));
    expect(
      within(screen.getByTestId('grupo-enCurso')).getByRole('button', fila('cc')).props.accessibilityLabel,
    ).toContain(es.novenas.esSuFiesta);
  });

  test('7 jun 2026 con país US: Corpus (jueves 4 jun) ya pasó y está en "Más adelante"', async () => {
    mockPais = 'US';
    await abrir('/novenas', new Date(2026, 5, 7, 10, 0));
    expect(within(screen.getByTestId('grupo-masAdelante')).getByRole('button', fila('cc'))).toBeTruthy();
    expect(screen.queryByTestId('grupo-enCurso')).toBeNull();
  });

});
