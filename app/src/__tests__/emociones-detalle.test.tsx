/// <reference types="jest" />
/*
 * Detalle de emoción: Depresión, Triste y Soledad siempre muestran la tarjeta de ayuda del país
 * (CLAUDE.md, principio 6): arriba en Depresión, al final en las otras dos; las demás no la muestran.
 * Monta las rutas reales de `src/app` con `renderRouter` (mismos mocks que navegacion-hoy.test.tsx).
 *
 * La pantalla `src/app/emocion/[id].tsx` la construye interfaz-movimiento en paralelo: si no existe,
 * las pruebas quedan como `test.todo`.
 */
import { screen } from '@testing-library/react-native';
import { act, renderRouter } from 'expo-router/testing-library';

import datos from '../../../content/contenido.json';
import { ayudaParaPais } from '@/contenido/ayuda';
import { filtrarPorRevision } from '@/contenido/filtro';
import type { Contenido, IdEmocion } from '@/contenido/tipos';
import { entradaDelDia } from '@/lib/emociones';
import { reiniciarOtraOracion } from '@/lib/otra-oracion';

declare const __dirname: string;
const path = require('path') as { resolve: (...p: string[]) => string };
const fs = require('fs') as { existsSync: (p: string) => boolean };

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
  return { ...real, useReducedMotion: () => false };
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
const HAY_DETALLE = fs.existsSync(path.resolve(RAIZ_APP, 'emocion', '[id].tsx'));
const contenido = filtrarPorRevision(datos as unknown as Contenido, 'desarrollo');
const HOY = new Date(2026, 9, 3, 10, 0);

async function abrir(url: string) {
  const r = renderRouter(RAIZ_APP, { initialUrl: url });
  await (r as unknown as Promise<unknown>);
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  return { getPathname: () => r.getPathname() };
}

type Nodo = { type: string; props: Record<string, any>; children: (Nodo | string)[] | null };

/** Textos visibles y etiquetas accesibles, en el orden del árbol. */
function textosEnOrden(): string[] {
  const out: string[] = [];
  const rec = (n: Nodo | Nodo[] | string | null, oculto: boolean) => {
    if (n == null) return;
    if (typeof n === 'string') {
      if (!oculto) out.push(n);
      return;
    }
    if (Array.isArray(n)) return n.forEach((x) => rec(x, oculto));
    const p = n.props ?? {};
    const o =
      oculto ||
      p.accessibilityElementsHidden === true ||
      p['aria-hidden'] === true ||
      p.importantForAccessibility === 'no-hide-descendants';
    if (!o && typeof p.accessibilityLabel === 'string') out.push(p.accessibilityLabel);
    (n.children ?? []).forEach((c) => rec(c as Nodo, o));
  };
  rec(screen.toJSON() as unknown as Nodo, false);
  return out;
}

const posicion = (textos: string[], agujas: string[]) =>
  textos.findIndex((t) => agujas.some((a) => a && t.includes(a)));

/** Lo que identifica la tarjeta de ayuda para un país: sus números, o el respaldo Find A Helpline. */
function agujasAyuda(pais: string): string[] {
  const r = ayudaParaPais(contenido.ayuda, pais);
  return r.tipo === 'pais'
    ? r.pais.lineas.flatMap((l) => [l.numero, l.nombre.es])
    : [r.respaldo.nombre.es, 'findahelpline'];
}

function contenidoDelDia(id: IdEmocion) {
  const em = contenido.emociones.find((e) => e.id === id)!;
  const e = entradaDelDia(em, HOY)!.entrada;
  return { versiculo: e.v[0], oracion: e.p[0] };
}

beforeEach(() => {
  reiniciarOtraOracion();
  jest.useFakeTimers({ now: HOY });
});
afterEach(() => {
  jest.useRealTimers();
});

const testDetalle = HAY_DETALLE ? test : test.skip;

describe('detalle de emoción: tarjeta de ayuda', () => {
  const casos: [IdEmocion, 'arriba' | 'final', string][] = [];
  for (const pais of ['CL', 'FR']) {
    casos.push(['depression', 'arriba', pais], ['sad', 'final', pais], ['lonely', 'final', pais]);
  }

  testDetalle.each(casos)('%s (%s) con país %s muestra la tarjeta de ayuda', async (id, donde, pais) => {
    mockPais = pais;
    await abrir(`/emocion/${id}`);
    const textos = textosEnOrden();
    const iAyuda = posicion(textos, agujasAyuda(pais));
    expect(iAyuda).toBeGreaterThanOrEqual(0);
    const { versiculo, oracion } = contenidoDelDia(id);
    const iVers = posicion(textos, [versiculo]);
    const iOrac = posicion(textos, [oracion]);
    expect(iVers).toBeGreaterThanOrEqual(0);
    expect(iOrac).toBeGreaterThanOrEqual(0);
    if (donde === 'arriba') expect(iAyuda).toBeLessThan(iVers);
    else expect(iAyuda).toBeGreaterThan(iOrac);
    // Ofrece cambiar de país en el momento.
    expect(textos.some((t) => /otro país/i.test(t))).toBe(true);
  });

  testDetalle('FR: no muestra ningún número de otro país', async () => {
    mockPais = 'FR';
    await abrir('/emocion/depression');
    const textos = textosEnOrden().join('\n');
    for (const p of contenido.ayuda.paises) for (const l of p.lineas) expect(textos).not.toContain(l.numero);
  });

  testDetalle('happy no muestra la tarjeta de ayuda', async () => {
    mockPais = 'CL';
    await abrir('/emocion/happy');
    const textos = textosEnOrden();
    expect(posicion(textos, [contenidoDelDia('happy').versiculo])).toBeGreaterThanOrEqual(0);
    expect(posicion(textos, agujasAyuda('CL'))).toBe(-1);
    expect(posicion(textos, agujasAyuda('FR'))).toBe(-1);
  });

  if (!HAY_DETALLE) {
    test.todo('falta app/src/app/emocion/[id].tsx (interfaz-movimiento): tarjeta de ayuda en Depresión, Triste y Soledad');
  }
});
