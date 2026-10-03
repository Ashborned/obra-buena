/// <reference types="jest" />
/*
 * Hoy → "Conocer su historia" abre la historia del santo del día (`/santo/MM-DD`),
 * y revisión de accesibilidad de Hoy con Testing Library.
 * Monta las rutas reales de `src/app` con `renderRouter` (expo-router/testing-library).
 */
import { screen } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';

import datos from '../../../content/contenido.json';
import type { Contenido } from '@/contenido/tipos';
import es from '@/i18n/locales/es.json';
import { rutaHistoriaSanto } from '@/lib/hoy';

// Sin @types/node en el proyecto (misma convención que region.test.ts).
declare const __dirname: string;
const path = require('path') as { resolve: (...p: string[]) => string };
const fs = require('fs') as { existsSync: (p: string) => boolean };

// Bienvenida completa, idioma español y país guardados (kv-store en memoria).
jest.mock('expo-sqlite/kv-store', () => {
  const guardado: Record<string, string> = {
    'preferencias.bienvenida': '1',
    'preferencias.idioma': 'es',
    'preferencias.pais': 'CL',
  };
  const leer = (k: string) => (k in guardado ? guardado[k] : null);
  const escribir = (k: string, v: string) => {
    guardado[k] = v;
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
  };
  return { __esModule: true, default: Storage, Storage };
});

// Progreso (velas, medallas) en SQLite: sin base nativa en Jest.
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

// expo-router/testing-library mockea Reanimated con 'react-native-reanimated/mock', que:
// - necesita el mock de worklets (sin él falla con "loadUnpackers" y el mock queda vacío);
// - no trae `useReducedMotion` ("ADD ME IF NEEDED"). La variable permite probar "Reducir movimiento".
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
let mockReducirMovimiento = false;
jest.mock('react-native-reanimated/mock', () => {
  const real = jest.requireActual('react-native-reanimated/mock');
  return { ...real, useReducedMotion: () => mockReducirMovimiento };
});

// Fuentes: listas al instante.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

// Skia: los gráficos dibujados (vitral, velas) se reemplazan por View. El mock oficial
// (@shopify/react-native-skia/lib/commonjs/mock) necesita CanvasKit (wasm), que no está configurado.
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
const NOMBRE_0929 = contenido.santos_del_dia['09-29'].es[0];
const HISTORIA_0929 = contenido.historias_santos['09-29'].es.st[0];

// La pantalla Hoy y `santo/[clave].tsx` las construye en paralelo interfaz-movimiento.
// Sin la ruta de la historia, las pruebas que la necesitan quedan omitidas (no en falla).
const HAY_RUTA_SANTO = fs.existsSync(path.resolve(RAIZ_APP, 'santo', '[clave].tsx'));
const testConRutaSanto = HAY_RUTA_SANTO ? test : test.skip;

async function abrir(url = '/') {
  const r = renderRouter(RAIZ_APP, { initialUrl: url });
  // RNTL 14: render es asíncrono; renderRouter devuelve la promesa con getPathname() pegado.
  await (r as unknown as Promise<unknown>);
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  // No se devuelve `r` directamente: es una promesa y `return` la desenvolvería (se pierde getPathname).
  return { getPathname: () => r.getPathname() };
}

beforeEach(() => {
  mockReducirMovimiento = false;
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 10, 0) }); // martes 29 sep 2026, 10:00 local
});
afterEach(() => {
  jest.useRealTimers();
});

describe('Hoy → historia del santo', () => {
  test('con la bienvenida completa, la app abre en Hoy', async () => {
    const r = await abrir();
    expect(r.getPathname()).toBe('/');
    expect(screen.getAllByText(es.pestanas.hoy).length).toBeGreaterThan(0);
  });

  testConRutaSanto('"Conocer su historia" navega a /santo/09-29 y muestra el santo', async () => {
    const r = await abrir();
    const boton = screen.getByRole('button', { name: es.hoy.conocerHistoria });
    await fireEvent.press(boton);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    expect(r.getPathname()).toBe('/santo/09-29');
    expect(screen.getAllByText(NOMBRE_0929).length).toBeGreaterThan(0);
    // El primer párrafo de la historia solo está en la pantalla del santo, no en Hoy. Va con letra
    // capital (ParrafoCapitular parte el texto), así que se busca por su etiqueta accesible completa.
    expect(screen.getByLabelText(HISTORIA_0929)).toBeTruthy();
  });

  testConRutaSanto('contrato: la ruta de rutaHistoriaSanto abre directamente la historia', async () => {
    const r = await abrir(rutaHistoriaSanto('09-29'));
    expect(r.getPathname()).toBe('/santo/09-29');
    expect(screen.getByLabelText(HISTORIA_0929)).toBeTruthy();
  });

  if (!HAY_RUTA_SANTO) {
    test.todo('falta app/src/app/santo/[clave].tsx (interfaz-movimiento): navegación Hoy → /santo/09-29');
  }
});

/* ------------------------------------------------------------------------------------------------
 * Accesibilidad de Hoy (lo que se puede comprobar en el árbol; objetivos táctiles y contraste se
 * revisan en el código y en el emulador).
 * ---------------------------------------------------------------------------------------------- */
type Nodo = { type: string; props: Record<string, any>; children: (Nodo | string)[] | null };

function recorrer(nodo: Nodo | Nodo[] | string | null, oculto: boolean, f: (n: Nodo, oculto: boolean) => void) {
  if (!nodo || typeof nodo === 'string') return;
  if (Array.isArray(nodo)) {
    nodo.forEach((n) => recorrer(n, oculto, f));
    return;
  }
  const p = nodo.props ?? {};
  const ocultoAqui =
    oculto ||
    p.accessibilityElementsHidden === true ||
    p['aria-hidden'] === true ||
    p.importantForAccessibility === 'no-hide-descendants';
  f(nodo, ocultoAqui);
  (nodo.children ?? []).forEach((c) => recorrer(c as Nodo, ocultoAqui, f));
}

const plano = (estilo: unknown): Record<string, unknown> =>
  Array.isArray(estilo) ? Object.assign({}, ...estilo.map(plano)) : ((estilo as Record<string, unknown>) ?? {});

const textoDe = (n: Nodo | string): string =>
  typeof n === 'string' ? n : (n.children ?? []).map(textoDe).join('');

describe('Hoy: accesibilidad', () => {
  test('todo lo tocable tiene accessibilityRole y accessibilityLabel', async () => {
    await abrir();
    const faltan: string[] = [];
    let tocables = 0;
    recorrer(screen.toJSON() as unknown as Nodo, false, (n, oculto) => {
      if (oculto || typeof n.props.onClick !== 'function') return;
      tocables++;
      if (!n.props.accessibilityRole || !n.props.accessibilityLabel) {
        faltan.push(`${n.props.accessibilityRole ?? '(sin rol)'} "${n.props.accessibilityLabel ?? textoDe(n)}"`);
      }
    });
    // Configuración, Conocer su historia, novena, evangelio, ¿Cómo te sientes? (+ pestañas).
    expect(tocables).toBeGreaterThanOrEqual(5);
    expect(faltan).toEqual([]);
  });

  test('los botones de Hoy se encuentran por rol y nombre', async () => {
    await abrir();
    expect(screen.getByRole('button', { name: es.hoy.conocerHistoria })).toBeTruthy();
    expect(screen.getByRole('button', { name: es.hoy.comoTeSientes })).toBeTruthy();
    expect(screen.getByRole('button', { name: es.acciones.abrirConfiguracion })).toBeTruthy();
    expect(screen.getByRole('button', { name: new RegExp(`^${es.hoy.novenaDeHoy}`) })).toBeTruthy();
    expect(screen.getByRole('button', { name: new RegExp(`^${es.hoy.evangelio}`) })).toBeTruthy();
  });

  test('el vitral es decorativo: su inicial no llega al lector de pantalla', async () => {
    await abrir();
    const ini = contenido.santos_del_dia['09-29'].ini;
    expect(screen.queryAllByText(ini, { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(ini)).toHaveLength(0);
  });

  test('el nombre del santo es un encabezado', async () => {
    await abrir();
    expect(screen.getByRole('header', { name: NOMBRE_0929 })).toBeTruthy();
  });

  test('la tarjeta del evangelio expone expanded y cambia al tocarla', async () => {
    await abrir();
    const nombre = new RegExp(`^${es.hoy.evangelio}`);
    const tarjeta = screen.getByRole('button', { name: nombre });
    expect(tarjeta.props.accessibilityState).toEqual(expect.objectContaining({ expanded: false }));
    expect(tarjeta.props.accessibilityHint).toBe(es.hoy.evangelioMostrar);
    await fireEvent.press(tarjeta);
    const abierta = screen.getByRole('button', { name: nombre });
    expect(abierta.props.accessibilityState).toEqual(expect.objectContaining({ expanded: true }));
    expect(abierta.props.accessibilityHint).toBe(es.hoy.evangelioOcultar);
  });

  test('ningún texto visible desactiva allowFontScaling', async () => {
    await abrir();
    const fijos: string[] = [];
    recorrer(screen.toJSON() as unknown as Nodo, false, (n, oculto) => {
      if (n.type === 'Text' && n.props.allowFontScaling === false && !oculto) fijos.push(textoDe(n));
    });
    expect(fijos).toEqual([]);
  });

  test('ningún contenedor de texto visible tiene alto fijo', async () => {
    await abrir();
    const fijos: string[] = [];
    recorrer(screen.toJSON() as unknown as Nodo, false, (n, oculto) => {
      if (oculto || n.type === 'Text') return;
      const e = plano(n.props.style);
      if (typeof e.height !== 'number' && typeof e.maxHeight !== 'number') return;
      let tieneTexto = false;
      recorrer(n.children as Nodo[], false, (h, o) => {
        if (!o && h.type === 'Text' && textoDe(h).trim()) tieneTexto = true;
      });
      if (tieneTexto) fijos.push(`${n.type} height=${String(e.height ?? e.maxHeight)}: "${textoDe(n).slice(0, 40)}"`);
    });
    expect(fijos).toEqual([]);
  });

  test('con "Reducir movimiento" Hoy se dibuja igual (sin animaciones obligatorias)', async () => {
    mockReducirMovimiento = true;
    await abrir();
    expect(screen.getByRole('button', { name: es.hoy.conocerHistoria })).toBeTruthy();
    expect(screen.getByRole('header', { name: NOMBRE_0929 })).toBeTruthy();
  });
});

describe('Hoy sin santo (3 oct 2026)', () => {
  test('muestra el respaldo, sin nombre ni botón de historia', async () => {
    jest.setSystemTime(new Date(2026, 9, 3, 10, 0));
    await abrir();
    expect(screen.getByText(es.hoy.sinSanto)).toBeTruthy();
    expect(screen.queryByRole('button', { name: es.hoy.conocerHistoria })).toBeNull();
    for (const s of Object.values(contenido.santos_del_dia)) {
      expect(screen.queryByText(s.es[0])).toBeNull();
    }
  });
});
