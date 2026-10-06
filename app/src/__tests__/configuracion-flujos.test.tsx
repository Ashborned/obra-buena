/// <reference types="jest" />
/*
 * Hito 7 · Configuración, flujos de punta a punta (QA, parte C ronda 2). Complementa
 * configuracion-interfaz.test.tsx (que simula "Borrar mis datos") con la lógica REAL:
 * preferencias, i18n, país, recordatorios, borrar-datos y progreso son los de la app.
 *
 * Dobles:
 * - expo-sqlite: tablas en memoria (como borrar-datos.test.ts), con WHERE simple y contador de escrituras.
 * - expo-sqlite/kv-store: objeto en memoria con contador de escrituras.
 * - expo-notifications: permisos controlables y avisos en un Map.
 * - lib/avisos: `moduloRecordatorios()` puede devolver null (Expo Go en Android).
 * - expo-localization: teléfono en es-CL.
 * - @expo/ui DateTimePicker: guarda sus props para elegir una hora.
 * - Reanimated / Skia / fuentes: como navegacion-novenas.test.tsx (+ ReducedMotionConfig y ReduceMotion).
 *
 * Cubre los puntos 1–6, 8 y 9 del pedido. El 7 está en animaciones-reducidas.test.tsx y el 10 en
 * privacidad-red.test.ts + red-documentada.test.ts.
 */
import { screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';
import { Alert, Linking, StyleSheet } from 'react-native';

import type { Ayuda, AyudaPais, Contenido } from '@/contenido/tipos';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';

declare const __dirname: string;
const path = require('path') as { resolve: (...p: string[]) => string };

// --- Mocks -----------------------------------------------------------------------------------------

const mockKV: Record<string, string> = {};
const mockEscriturasKV: string[] = [];
let mockClearFalla = false;

jest.mock('expo-sqlite/kv-store', () => {
  const leer = (k: string) => (k in mockKV ? mockKV[k] : null);
  const escribir = (k: string, v: string) => {
    mockEscriturasKV.push(k);
    mockKV[k] = v;
  };
  const quitar = (k: string) => {
    mockEscriturasKV.push(`-${k}`);
    delete mockKV[k];
  };
  const Storage = {
    getItemSync: leer,
    setItemSync: escribir,
    getAllKeysSync: () => Object.keys(mockKV),
    removeItemSync: quitar,
    getItem: async (k: string) => leer(k),
    getItemAsync: async (k: string) => leer(k),
    setItem: async (k: string, v: string) => escribir(k, v),
    setItemAsync: async (k: string, v: string) => escribir(k, v),
    removeItem: async (k: string) => quitar(k),
    removeItemAsync: async (k: string) => quitar(k),
    clearAsync: async () => {
      if (mockClearFalla) throw new Error('falla simulada de kv-store');
      mockEscriturasKV.push('clear');
      for (const k of Object.keys(mockKV)) delete mockKV[k];
    },
  };
  return { __esModule: true, default: Storage, Storage };
});

const mockTablas: Record<string, Record<string, unknown>[]> = {};
const mockSQL = { version: 0, escrituras: 0 };

jest.mock('expo-sqlite', () => {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  /** `WHERE a = ? AND b = ?` → filtro con los parámetros (lo justo para progreso.ts). */
  const filtro = (s: string, p: unknown[]) => {
    const w = /WHERE (.+?)(?: ORDER BY .*)?$/.exec(s);
    if (!w) return () => true;
    const cols = w[1].split(' AND ').map((c) => /^(\w+) = \?$/.exec(c.trim())?.[1]);
    return (f: Record<string, unknown>) => cols.every((c, i) => !c || f[c] === p[i]);
  };
  const db = {
    execAsync: async (sql: string) => {
      for (const parte of norm(sql).split(';').map((x) => x.trim()).filter(Boolean)) {
        const crear = /^CREATE TABLE IF NOT EXISTS (\w+)/.exec(parte);
        const version = /^PRAGMA user_version = (\d+)$/.exec(parte);
        const borrar = /^DELETE FROM (\w+)$/.exec(parte);
        if (crear) mockTablas[crear[1]] ??= [];
        else if (version) mockSQL.version = Number(version[1]);
        else if (borrar) {
          mockSQL.escrituras++;
          mockTablas[borrar[1]] = [];
        } else if (parte !== 'PRAGMA journal_mode = WAL') throw new Error(`execAsync no esperado: ${parte}`);
      }
    },
    getFirstAsync: async (sql: string) => {
      if (norm(sql) === 'PRAGMA user_version') return { user_version: mockSQL.version };
      throw new Error(`getFirstAsync no esperado: ${sql}`);
    },
    withTransactionAsync: async (f: () => Promise<void>) => f(),
    getAllAsync: async (sql: string, ...p: unknown[]) => {
      const s = norm(sql);
      if (/FROM sqlite_master/.test(s)) return Object.keys(mockTablas).map((name) => ({ name }));
      const de = /FROM (\w+)/.exec(s);
      if (de && de[1] in mockTablas) return mockTablas[de[1]].filter(filtro(s, p)).map((f) => ({ ...f }));
      if (de) return [];
      throw new Error(`getAllAsync no esperado: ${s}`);
    },
    runAsync: async (sql: string, ...p: unknown[]) => {
      const s = norm(sql);
      mockSQL.escrituras++;
      const ins = /^INSERT (?:OR IGNORE )?INTO (\w+) \(([^)]+)\)/.exec(s);
      if (ins) {
        const cols = ins[2].split(',').map((c) => c.trim());
        (mockTablas[ins[1]] ??= []).push(Object.fromEntries(cols.map((c, i) => [c, p[i]])));
        return { changes: 1, lastInsertRowId: 0 };
      }
      const del = /^DELETE FROM (\w+)/.exec(s);
      if (del) {
        const f = filtro(s, p);
        mockTablas[del[1]] = (mockTablas[del[1]] ?? []).filter((x) => !f(x));
        return { changes: 1, lastInsertRowId: 0 };
      }
      throw new Error(`runAsync no esperado: ${s}`);
    },
  };
  return { openDatabaseAsync: async () => db };
});

const mockPermiso = { actual: { granted: true, canAskAgain: true }, pedido: { granted: true } };
const mockAvisos = { siguiente: 0, programados: new Map<string, unknown>() };
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: () => null,
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  getPermissionsAsync: jest.fn(async () => mockPermiso.actual),
  requestPermissionsAsync: jest.fn(async () => mockPermiso.pedido),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async (req: unknown) => {
    const id = `id-${++mockAvisos.siguiente}`;
    mockAvisos.programados.set(id, req);
    return id;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockAvisos.programados.delete(id);
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockAvisos.programados.clear();
  }),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

/** `true` simula Expo Go en Android: sin módulo de recordatorios. */
let mockSinRecordatorios = false;
jest.mock('@/lib/avisos', () => {
  const real = jest.requireActual('@/lib/avisos');
  return {
    moduloNotificaciones: real.moduloNotificaciones,
    moduloRecordatorios: () => (mockSinRecordatorios ? null : real.moduloRecordatorios()),
  };
});

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es', regionCode: 'CL', languageTag: 'es-CL' }],
}));

const mockSelectorHora: { props?: { onValueChange: (e: unknown, d: Date) => void } } = {};
jest.mock('@expo/ui/community/datetime-picker', () => ({
  DateTimePicker: (p: { onValueChange: (e: unknown, d: Date) => void }) => {
    mockSelectorHora.props = p;
    return null;
  },
}));

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
const mockReducedMotionConfig = jest.fn((_p: { mode: string }) => null);
jest.mock('react-native-reanimated/mock', () => {
  const real = jest.requireActual('react-native-reanimated/mock');
  return {
    ...real,
    useReducedMotion: () => false,
    ReducedMotionConfig: (p: { mode: string }) => mockReducedMotionConfig(p),
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

/* eslint-disable @typescript-eslint/no-require-imports */
const i18n = require('@/i18n').default as typeof import('@/i18n').default;
const { idiomaInicial } = require('@/i18n') as typeof import('@/i18n');
const contenidoApp = (require('@/contenido') as typeof import('@/contenido')).contenido as Contenido;
const { filtrarPorRevision } = require('@/contenido') as typeof import('@/contenido');
const { resolverTema } = require('@/theme/resolver') as typeof import('@/theme/resolver');
const { PALETA_POR_DEFECTO } = require('@/theme/paletas') as typeof import('@/theme/paletas');
const { horaCorta } = require('@/lib/formato-fecha') as typeof import('@/lib/formato-fecha');
const { reiniciarOtraOracion } = require('@/lib/otra-oracion') as typeof import('@/lib/otra-oracion');
const BorrarDatos = require('@/lib/borrar-datos') as typeof import('@/lib/borrar-datos');
const Notificaciones = jest.requireMock('expo-notifications') as Record<string, jest.Mock>;
/* eslint-enable @typescript-eslint/no-require-imports */

const RAIZ_APP = path.resolve(__dirname, '../app');
const c = es.configuracion;
const ce = en.configuracion;
const AYUDA_REAL = contenidoApp.ayuda;
const PATROCINIO_REAL = contenidoApp.patrocinio;
const DIEZ = new Date(2026, 8, 29, 10, 0);

const plano = (s: unknown) => (StyleSheet.flatten(s as never) ?? {}) as Record<string, unknown>;
const estilo = (n: { props: Record<string, unknown> }) =>
  plano(typeof n.props.style === 'function' ? (n.props.style as (x: unknown) => unknown)({ pressed: false }) : n.props.style);

function estadoInicial() {
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  Object.assign(mockKV, { 'preferencias.bienvenida': '1', 'preferencias.idioma': 'es', 'preferencias.pais': 'CL' });
  mockEscriturasKV.length = 0;
  for (const k of Object.keys(mockTablas)) delete mockTablas[k];
  mockSQL.version = 0;
  mockSQL.escrituras = 0;
  mockAvisos.programados.clear();
  mockPermiso.actual = { granted: true, canAskAgain: true };
  mockPermiso.pedido = { granted: true };
  mockSinRecordatorios = false;
  mockClearFalla = false;
  delete mockSelectorHora.props;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function esperar() {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  await flush();
}

let montada: { unmount: () => Promise<void> } | null = null;

async function abrir(url: string, fecha = DIEZ) {
  if (montada) await desmontar();
  jest.useFakeTimers({ now: fecha });
  const r = renderRouter(RAIZ_APP, { initialUrl: url });
  const res = (await (r as unknown as Promise<unknown>)) as { unmount: () => Promise<void> };
  montada = res;
  await esperar();
  // Sin devolver `r` tal cual: es "thenable" y `await abrir()` lo desenvolvería.
  return { getPathname: () => r.getPathname() };
}

async function desmontar() {
  const m = montada;
  montada = null;
  if (m) await act(async () => m.unmount());
}

async function ir(url: string) {
  await act(async () => {
    router.push(url as never);
  });
  await esperar();
}

async function volver() {
  await act(async () => {
    router.back();
  });
  await esperar();
}

type Nodo = { type: string; props: Record<string, any>; children: (Nodo | string)[] | null };

/** Textos visibles y etiquetas accesibles, en el orden del árbol (como emociones-detalle.test.tsx). */
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
    (n.children ?? []).forEach((ch) => rec(ch as Nodo, o));
  };
  rec(screen.toJSON() as unknown as Nodo, false);
  return out;
}

/** Colores de fondo de todas las vistas de la pantalla. */
function fondos(): Set<string> {
  const s = new Set<string>();
  for (const n of screen.container.queryAll(() => true)) {
    const bg = plano(n.props.style).backgroundColor;
    if (typeof bg === 'string') s.add(bg);
  }
  return s;
}

const radio = (nombre: string) => screen.getByRole('radio', { name: new RegExp(`^${nombre}(\\.|$)`) });
const marcado = (nombre: string) => radio(nombre).props.accessibilityState?.checked === true;

beforeEach(() => {
  estadoInicial();
  reiniciarOtraOracion();
  for (const f of Object.values(Notificaciones)) if (typeof f?.mockClear === 'function') f.mockClear();
  mockReducedMotionConfig.mockClear();
});

afterEach(async () => {
  await desmontar();
  jest.useRealTimers();
  contenidoApp.ayuda = AYUDA_REAL;
  contenidoApp.patrocinio = PATROCINIO_REAL;
  await i18n.changeLanguage('es');
});

// --- 1. Cada preferencia se guarda y sigue elegida al volver a montar -----------------------------

describe('1 · preferencias elegidas en la pantalla', () => {
  test('paleta, hora de oración y animaciones: se guardan y siguen elegidas al volver a montar', async () => {
    await abrir('/configuracion');
    await fireEvent.press(radio(c.paletas.vitral));
    await fireEvent.press(radio(c.horas.dusk));
    await fireEvent.press(radio(c.animacionesOpciones.reducidas));
    await flush();
    expect(mockKV['preferencias.paleta']).toBe('vitral');
    expect(mockKV['preferencias.hora']).toBe('dusk');
    expect(mockKV['preferencias.animaciones']).toBe('reducidas');
    // "Reducidas" monta ReducedMotionConfig en Always.
    expect(mockReducedMotionConfig).toHaveBeenLastCalledWith({ mode: 'always' });

    await desmontar();
    mockReducedMotionConfig.mockClear();
    await abrir('/configuracion');
    expect(marcado(c.paletas.vitral)).toBe(true);
    expect(marcado(c.paletas.rosaMistica)).toBe(false);
    expect(marcado(c.horas.dusk)).toBe(true);
    expect(marcado(c.horas.auto)).toBe(false);
    expect(marcado(c.animacionesOpciones.reducidas)).toBe(true);
    expect(mockReducedMotionConfig).toHaveBeenCalledWith({ mode: 'always' });
  });

  test('idioma: elegir English cambia la pantalla al instante, se guarda y manda al volver a montar', async () => {
    await abrir('/configuracion');
    await fireEvent.press(radio('English'));
    await flush();
    expect(screen.getByRole('header', { name: ce.secciones.apariencia })).toBeTruthy();
    expect(mockKV['preferencias.idioma']).toBe('en');
    expect(idiomaInicial()).toBe('en');

    await desmontar();
    await abrir('/configuracion');
    expect(marcado('English')).toBe(true);
    expect(marcado('Español')).toBe(false);
  });

  test('país: elegir México en el selector se guarda y sigue elegido al volver a montar', async () => {
    const r = await abrir('/configuracion');
    await fireEvent.press(screen.getByRole('button', { name: c.paisActual.replace('{{pais}}', 'Chile') }));
    await esperar();
    expect(r.getPathname()).toBe('/pais');
    await fireEvent.press(radio('México'));
    await esperar();
    expect(r.getPathname()).toBe('/configuracion');
    expect(screen.getByRole('button', { name: c.paisActual.replace('{{pais}}', 'México') })).toBeTruthy();
    expect(mockKV['preferencias.pais']).toBe('MX');

    await desmontar();
    await abrir('/configuracion');
    expect(screen.getByRole('button', { name: c.paisActual.replace('{{pais}}', 'México') })).toBeTruthy();
  });

  test('hora de los recordatorios: elegir 21:30 la guarda y sigue al volver a montar', async () => {
    await abrir('/configuracion');
    const etiqueta = (h: number, m: number) => c.recordatorios.horaAccesible.replace('{{hora}}', horaCorta(h, m, 'es'));
    await fireEvent.press(screen.getByRole('button', { name: etiqueta(8, 0) }));
    expect(mockSelectorHora.props).toBeDefined();
    await act(async () => mockSelectorHora.props!.onValueChange({}, new Date(2000, 0, 1, 21, 30)));
    await fireEvent.press(screen.getByRole('button', { name: es.novenas.listo }));
    await flush();
    expect(screen.getByRole('button', { name: etiqueta(21, 30) })).toBeTruthy();
    expect(mockKV['preferencias.horaRecordatorio']).toBe('21:30');

    await desmontar();
    await abrir('/configuracion');
    expect(screen.getByRole('button', { name: etiqueta(21, 30) })).toBeTruthy();
  });

  test('ReinicioProvider: tras reiniciar (sin borrar) los proveedores releen y todo sigue elegido', async () => {
    // Se usa el reinicio real de la app; solo se evita el borrado para ver que se relee lo guardado.
    const espia = jest.spyOn(BorrarDatos, 'borrarMisDatos').mockResolvedValue(undefined);
    try {
      const r = await abrir('/configuracion');
      await fireEvent.press(radio(c.paletas.vitral));
      await fireEvent.press(radio(c.horas.night));
      await fireEvent.press(radio(c.animacionesOpciones.reducidas));
      await flush();
      await fireEvent.press(screen.getByRole('button', { name: c.privacidad.borrar }));
      // Un cambio guardado "por fuera" (sin pasar por la interfaz) solo se ve si los proveedores releen.
      mockKV['preferencias.hora'] = 'dusk';
      expect(marcado(c.horas.night)).toBe(true);
      await fireEvent.press(screen.getByRole('button', { name: c.borrado.confirmar }));
      await esperar();
      expect(espia).toHaveBeenCalledTimes(1);
      // El árbol de la app se volvió a montar (la navegación vive fuera de él y sigue en Configuración):
      // la hoja de confirmación, que era estado local, ya no está.
      expect(r.getPathname()).toBe('/configuracion');
      expect(screen.queryByRole('header', { name: c.borrado.titulo })).toBeNull();
      expect(marcado(c.paletas.vitral)).toBe(true);
      expect(marcado(c.horas.dusk)).toBe(true);
      expect(marcado(c.animacionesOpciones.reducidas)).toBe(true);
    } finally {
      espia.mockRestore();
    }
  });
});

// --- 2. Hora fija desde la pantalla ----------------------------------------------------------------

describe('2 · hora de oración fija cambia el cielo', () => {
  const fondo = (hora: 'day' | 'dusk' | 'night', paleta = PALETA_POR_DEFECTO) => resolverTema(paleta, hora).cielo.fondo;

  test('precondición: los tres cielos tienen fondos distintos', () => {
    expect(new Set([fondo('day'), fondo('dusk'), fondo('night')]).size).toBe(3);
  });

  test('a las 10:00 (reloj = Laudes): Completas y Vísperas cambian el cielo; Automática vuelve al reloj', async () => {
    await abrir('/configuracion', DIEZ);
    expect(fondos().has(fondo('day'))).toBe(true);

    await fireEvent.press(radio(c.horas.night));
    await esperar();
    expect(fondos().has(fondo('night'))).toBe(true);
    expect(fondos().has(fondo('day'))).toBe(false);

    await fireEvent.press(radio(c.horas.dusk));
    await esperar();
    expect(fondos().has(fondo('dusk'))).toBe(true);
    expect(fondos().has(fondo('night'))).toBe(false);

    await fireEvent.press(radio(c.horas.auto));
    await esperar();
    expect(fondos().has(fondo('day'))).toBe(true);
    expect(fondos().has(fondo('dusk'))).toBe(false);
    expect(mockKV['preferencias.hora']).toBe('auto');
  });

  test('a las 22:00 (reloj = Completas): Laudes pone la luz de la mañana; Automática vuelve a la noche', async () => {
    await abrir('/configuracion', new Date(2026, 8, 29, 22, 0));
    expect(fondos().has(fondo('night'))).toBe(true);
    await fireEvent.press(radio(c.horas.day));
    await esperar();
    expect(fondos().has(fondo('day'))).toBe(true);
    expect(fondos().has(fondo('night'))).toBe(false);
    await fireEvent.press(radio(c.horas.auto));
    await esperar();
    expect(fondos().has(fondo('night'))).toBe(true);
    expect(fondos().has(fondo('day'))).toBe(false);
  });
});

// --- 3. Cambiar el país cambia la tarjeta de ayuda ------------------------------------------------

describe('3 · país de Configuración → tarjeta de ayuda en Emociones', () => {
  // Números ficticios que no existen. AR y MX aprobados, PE en borrador (en producción se quita).
  const pais = (codigo: string, nombre: string, numeros: string[], revision: AyudaPais['revision'] = 'aprobado'): AyudaPais => ({
    pais: codigo,
    nombre: { es: nombre, en: nombre },
    emergencia: `90${codigo.charCodeAt(0)}`,
    lineas: numeros.map((n) => ({
      nombre: { es: `Línea ${n}`, en: `Line ${n}` },
      numero: n,
      marcar: n,
      detalle: { es: '24/7', en: '24/7' },
      fuente: `https://ejemplo.invalid/${codigo}`,
    })),
    verificado: '2026-10-01',
    revision,
  });
  const PRUEBA: Ayuda = {
    respaldo: AYUDA_REAL.respaldo,
    paises: [
      pais('AR', 'Argentina', ['111 1111', '111 2222']),
      pais('MX', 'México', ['222 1111']),
      pais('PE', 'Perú', ['333 1111'], 'borrador'),
    ],
  };
  const numeros = (codigo: string) => PRUEBA.paises.find((p) => p.pais === codigo)!.lineas.map((l) => l.numero);
  const todos = PRUEBA.paises.flatMap((p) => p.lineas.map((l) => l.numero));
  const respaldo = AYUDA_REAL.respaldo.nombre.es;

  /** Elegir país en Configuración, cerrar Configuración y abrir Depresión. */
  async function elegirYVer(r: { getPathname: () => string }, actual: string, nuevo: string) {
    await ir('/configuracion');
    await fireEvent.press(screen.getByRole('button', { name: c.paisActual.replace('{{pais}}', actual) }));
    await esperar();
    expect(r.getPathname()).toBe('/pais');
    await fireEvent.press(radio(nuevo));
    await esperar();
    await volver(); // cierra Configuración
    await ir('/emocion/depression');
    return textosEnOrden().join('\n');
  }

  function soloDe(textos: string, codigo: string | null) {
    const propios = codigo ? numeros(codigo) : [];
    for (const n of propios) expect(textos).toContain(n);
    for (const n of todos.filter((x) => !propios.includes(x))) expect(textos).not.toContain(n);
    // Tampoco ningún número del contenido real (otro país).
    for (const p of AYUDA_REAL.paises) for (const l of p.lineas) expect(textos).not.toContain(l.numero);
  }

  beforeEach(() => {
    contenidoApp.ayuda = filtrarPorRevision({ ...contenidoApp, ayuda: PRUEBA }, 'produccion').ayuda;
    mockKV['preferencias.pais'] = 'AR';
  });

  test('AR → MX → AR: la tarjeta muestra solo las líneas del país elegido', async () => {
    const r = await abrir('/emocion/depression');
    soloDe(textosEnOrden().join('\n'), 'AR');

    const mx = await elegirYVer(r, 'Argentina', 'México');
    soloDe(mx, 'MX');
    expect(mx).toContain(es.ayuda.enPais.replace('{{pais}}', 'México'));
    expect(mx).not.toContain(respaldo);

    const ar = await elegirYVer(r, 'México', 'Argentina');
    soloDe(ar, 'AR');
  });

  test('país sin líneas (Chile, región del teléfono) → respaldo Find A Helpline, ningún número', async () => {
    const r = await abrir('/emocion/depression');
    const cl = await elegirYVer(r, 'Argentina', 'Chile');
    soloDe(cl, null);
    expect(cl).toContain(respaldo);
    expect(cl).toContain(AYUDA_REAL.respaldo.nota.es);
  });

  test('"Otro país o prefiero no decirlo" → respaldo; Perú en borrador no aparece en el selector', async () => {
    const r = await abrir('/');
    await ir('/configuracion');
    await fireEvent.press(screen.getByRole('button', { name: c.paisActual.replace('{{pais}}', 'Argentina') }));
    await esperar();
    expect(screen.queryByRole('radio', { name: 'Perú' })).toBeNull();
    await fireEvent.press(radio(es.pais.otro));
    await esperar();
    expect(r.getPathname()).toBe('/configuracion');
    expect(mockKV['preferencias.pais']).toBe('ZZ');
    await volver();
    await ir('/emocion/sad');
    const t = textosEnOrden().join('\n');
    soloDe(t, null);
    expect(t).toContain(respaldo);
  });

  test('desde la tarjeta: "¿Estás en otro país?" → México → la misma tarjeta cambia', async () => {
    const r = await abrir('/emocion/lonely');
    soloDe(textosEnOrden().join('\n'), 'AR');
    await fireEvent.press(screen.getByRole('link', { name: es.ayuda.otroPais }));
    await esperar();
    expect(r.getPathname()).toBe('/pais');
    await fireEvent.press(radio('México'));
    await esperar();
    expect(r.getPathname()).toBe('/emocion/lonely');
    soloDe(textosEnOrden().join('\n'), 'MX');
  });
});

// --- 4. Interruptores de recordatorio -------------------------------------------------------------

describe('4 · recordatorios en Configuración', () => {
  const nombreTer = () => contenidoApp.novenas.find((n) => n.id === 'ter')!.es;
  const interruptor = () =>
    screen.getByRole('switch', { name: c.recordatorios.interruptor.replace('{{nombre}}', nombreTer()) });

  beforeEach(() => {
    mockKV['recordatorios.ter.2026'] = JSON.stringify({ hora: { h: 8, m: 0 }, ids: ['id-a', 'id-b'] });
  });

  test('con uno activo: aparece la fila; apagar cancela esos ids; encender pide permiso y reprograma', async () => {
    await abrir('/configuracion');
    expect(interruptor().props.accessibilityState).toMatchObject({ checked: true });

    await fireEvent.press(interruptor());
    await esperar();
    expect(Notificaciones.cancelScheduledNotificationAsync.mock.calls.map((x) => x[0]).sort()).toEqual(['id-a', 'id-b']);
    expect(mockKV['recordatorios.ter.2026']).toBeUndefined();
    // La fila sigue visible, apagada, para poder volver a encenderla.
    expect(interruptor().props.accessibilityState).toMatchObject({ checked: false });

    mockPermiso.actual = { granted: false, canAskAgain: true };
    mockPermiso.pedido = { granted: true };
    await fireEvent.press(interruptor());
    await esperar();
    expect(Notificaciones.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notificaciones.scheduleNotificationAsync).toHaveBeenCalled();
    expect(interruptor().props.accessibilityState).toMatchObject({ checked: true });
    const guardado = JSON.parse(mockKV['recordatorios.ter.2026']);
    expect(guardado.hora).toEqual({ h: 8, m: 0 });
    expect(guardado.ids.length).toBe(Notificaciones.scheduleNotificationAsync.mock.calls.length);
  });

  test('permiso negado al encender → "Abrir ajustes" abre los ajustes del sistema; la fila sigue apagada', async () => {
    const ajustes = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never);
    try {
      await abrir('/configuracion');
      await fireEvent.press(interruptor());
      await esperar();
      mockPermiso.actual = { granted: false, canAskAgain: false };
      await fireEvent.press(interruptor());
      await esperar();
      expect(Notificaciones.scheduleNotificationAsync).not.toHaveBeenCalled();
      expect(screen.getByText(es.novenas.sinPermiso)).toBeTruthy();
      expect(interruptor().props.accessibilityState).toMatchObject({ checked: false });
      await fireEvent.press(screen.getByRole('button', { name: es.novenas.abrirAjustes }));
      expect(ajustes).toHaveBeenCalledTimes(1);
    } finally {
      ajustes.mockRestore();
    }
  });

  test('permiso negado tras pedirlo (canAskAgain) → mismo aviso', async () => {
    await abrir('/configuracion');
    await fireEvent.press(interruptor());
    await esperar();
    mockPermiso.actual = { granted: false, canAskAgain: true };
    mockPermiso.pedido = { granted: false };
    await fireEvent.press(interruptor());
    await esperar();
    expect(Notificaciones.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: es.novenas.abrirAjustes })).toBeTruthy();
  });

  test('sin recordatorios: el texto de ninguno, sin interruptores', async () => {
    delete mockKV['recordatorios.ter.2026'];
    await abrir('/configuracion');
    expect(screen.getByText(c.recordatorios.ninguno)).toBeTruthy();
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
  });

  test('sin módulo de recordatorios (Expo Go en Android): "necesitan la app instalada" y nada más', async () => {
    mockSinRecordatorios = true;
    await abrir('/configuracion');
    expect(screen.getByText(c.recordatorios.noDisponibles)).toBeTruthy();
    expect(screen.queryByText(c.recordatorios.ninguno)).toBeNull();
    expect(screen.queryByRole('header', { name: c.recordatorios.horaPorDefecto })).toBeNull();
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
  });
});

describe('4b · recordatorios y cambio de país en la misma visita a Configuración', () => {
  // Corpus Christi: en Chile se traslada al domingo (contenido.traslados); en México no.
  // 2027: jueves 27 de mayo (MX) / domingo 30 de mayo (CL). Hoy: 10 de mayo de 2027.
  const MAYO_10 = new Date(2027, 4, 10, 10, 0);
  const nombreCc = () => contenidoApp.novenas.find((n) => n.id === 'cc')!.es;
  const fila = () => screen.getByRole('switch', { name: c.recordatorios.interruptor.replace('{{nombre}}', nombreCc()) });

  beforeEach(() => {
    mockKV['recordatorios.cc.2027'] = JSON.stringify({ hora: { h: 8, m: 0 }, ids: ['id-a'] });
  });

  async function cambiarAMexico() {
    await fireEvent.press(screen.getByRole('button', { name: c.paisActual.replace('{{pais}}', 'Chile') }));
    await esperar();
    await fireEvent.press(radio('México'));
    await esperar();
  }

  test('al volver a abrir Configuración, las fechas de la fila siguen al país', async () => {
    await abrir('/configuracion', MAYO_10);
    const enChile = fila().props.accessibilityHint;
    await cambiarAMexico();
    await desmontar();
    await abrir('/configuracion', MAYO_10);
    expect(fila().props.accessibilityHint).not.toBe(enChile);
  });

  // Corregido (informe QA hito 7): Configuración sigue montada debajo del selector de país; antes las
  // filas guardaban las fechas del país anterior y reprogramaban con ellas.
  test('cambiar el país sin cerrar Configuración actualiza las fechas y reprograma con las nuevas', async () => {
    await abrir('/configuracion', MAYO_10);
    const enChile = fila().props.accessibilityHint;
    await cambiarAMexico();
    await esperar();
    expect(fila().props.accessibilityHint).not.toBe(enChile);
    // El aviso encendido se reprogramó solo, con las fechas de México (la novena empieza el 18 de mayo).
    const alCambiar = Notificaciones.scheduleNotificationAsync.mock.calls.map(
      (x) => (x[0] as { trigger: { date: Date } }).trigger.date,
    );
    expect(alCambiar.length).toBeGreaterThan(0);
    expect(alCambiar[0].getDate()).toBe(18);
    Notificaciones.scheduleNotificationAsync.mockClear();
    // Apagar y encender: el primer aviso debe caer el primer día de la novena en México (18 de mayo).
    await fireEvent.press(fila());
    await esperar();
    await fireEvent.press(fila());
    await esperar();
    const fechas = Notificaciones.scheduleNotificationAsync.mock.calls.map((x) => (x[0] as { trigger: { date: Date } }).trigger.date);
    expect(fechas[0].getDate()).toBe(18);
  });
});

// --- 5. "Borrar mis datos" de punta a punta --------------------------------------------------------

describe('5 · Borrar mis datos (borrado real)', () => {
  function usarLaApp() {
    Object.assign(mockKV, {
      'preferencias.paleta': 'vitral',
      'preferencias.hora': 'night',
      'preferencias.pais': 'US',
      'preferencias.animaciones': 'reducidas',
      'preferencias.letraLector': '21',
      'recordatorios.ter.2026': JSON.stringify({ hora: { h: 8, m: 0 }, ids: ['id-a'] }),
    });
    mockAvisos.programados.set('id-a', {});
    mockTablas.velas = [{ novena: 'ter', anio_fiesta: 2026, dia: 1, encendida_en: '2026-10-06T10:00:00.000Z' }];
    mockTablas.medallas = [{ lectura: 'pablo', puntaje: 5, ganada_en: '2026-10-01T12:00:00.000Z' }];
    mockTablas.rasgos = [{ lectura: 'pablo', rasgo: 'light', descubierto_en: '2026-10-01T12:00:00.000Z' }];
    mockTablas.medallas_coleccion = [{ coleccion: 'apo', ganada_en: '2026-10-01T12:00:00.000Z' }];
  }
  const filas = () => Object.values(mockTablas).reduce((n, t) => n + t.length, 0);

  test('confirmación en un Modal propio (sin Alert); Cancelar no borra nada', async () => {
    usarLaApp();
    const alerta = jest.spyOn(Alert, 'alert');
    try {
      await abrir('/configuracion');
      const kvAntes = { ...mockKV };
      const filasAntes = filas();
      await fireEvent.press(screen.getByRole('button', { name: c.privacidad.borrar }));
      expect(alerta).not.toHaveBeenCalled();
      const hoja = screen.container.queryAll((n) => n.props.accessibilityViewIsModal === true);
      expect(hoja.length).toBeGreaterThan(0);
      // La hoja vive dentro de un <Modal> de React Native.
      let p = hoja[0].parent;
      while (p && p.type !== 'Modal') p = p.parent;
      expect(p?.type).toBe('Modal');
      expect(p!.props.transparent).toBe(true);
      expect(screen.getByRole('header', { name: c.borrado.titulo })).toBeTruthy();
      for (const k of ['velas', 'aprender', 'recordatorios', 'preferencias'] as const) {
        expect(screen.getByText(c.borrado[k])).toBeTruthy();
      }

      await fireEvent.press(screen.getByRole('button', { name: c.borrado.cancelar }));
      await esperar();
      expect(screen.queryByRole('header', { name: c.borrado.titulo })).toBeNull();
      expect(mockKV).toEqual(kvAntes);
      expect(filas()).toBe(filasAntes);
      expect(Notificaciones.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
      expect(mockAvisos.programados.size).toBe(1);
    } finally {
      alerta.mockRestore();
    }
  });

  test('"Borrar todo": queda como recién instalado y aparece la bienvenida con la paleta por defecto', async () => {
    usarLaApp();
    const r = await abrir('/configuracion');
    const fondoVitralNoche = resolverTema('vitral', 'night').cielo.fondo;
    expect(fondos().has(fondoVitralNoche)).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: c.privacidad.borrar }));
    await fireEvent.press(screen.getByRole('button', { name: c.borrado.confirmar }));
    await esperar();
    await esperar();

    // Todo vacío: kv-store, tablas (con su esquema), avisos programados.
    expect(mockKV).toEqual({});
    expect(filas()).toBe(0);
    expect(Object.keys(mockTablas).sort()).toEqual(['medallas', 'medallas_coleccion', 'rasgos', 'velas']);
    expect(Notificaciones.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mockAvisos.programados.size).toBe(0);

    // Bienvenida, sin pestañas, con la paleta por defecto y la hora del reloj (10:00 → Laudes).
    expect(r.getPathname()).toBe('/bienvenida');
    expect(screen.getByText(es.bienvenida.titulo)).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(fondos().has(resolverTema(PALETA_POR_DEFECTO, 'day').cielo.fondo)).toBe(true);
    expect(fondos().has(fondoVitralNoche)).toBe(false);
    // Animaciones vuelven a "Según el sistema".
    mockReducedMotionConfig.mockClear();
    await esperar();
    expect(mockReducedMotionConfig).not.toHaveBeenCalled();
  });

  test('si el borrado falla: mensaje de error, no se reinicia y las preferencias de la sesión siguen', async () => {
    usarLaApp();
    mockClearFalla = true;
    const r = await abrir('/configuracion');
    await fireEvent.press(screen.getByRole('button', { name: c.privacidad.borrar }));
    await fireEvent.press(screen.getByRole('button', { name: c.borrado.confirmar }));
    await esperar();
    expect(screen.getByText(c.borrado.error)).toBeTruthy();
    expect(r.getPathname()).toBe('/configuracion');
    expect(screen.queryByText(es.bienvenida.titulo)).toBeNull();
    // Sigue la hoja abierta y se puede reintentar (botón habilitado de nuevo).
    expect(screen.getByRole('button', { name: c.borrado.confirmar }).props.accessibilityState).toMatchObject({
      disabled: false,
    });
    expect(marcado(c.paletas.vitral)).toBe(true);
  });
});

// --- 6. Apoyar la app no desbloquea nada -----------------------------------------------------------

describe('6 · Apoyar la app', () => {
  const botonAporte = (id: keyof typeof c.apoyo.aportes) =>
    c.apoyo.botonAporte.replace('{{nombre}}', c.apoyo.aportes[id]).replace('{{precio}}', c.apoyo.montoPorDefinir);

  async function arbolDe(url: string) {
    await abrir(url);
    await esperar();
    return textosEnOrden();
  }

  test('tras el gracias, Hoy, Aprender y Novenas son iguales y no se escribió nada', async () => {
    mockTablas.velas = [{ novena: 'ter', anio_fiesta: 2026, dia: 1, encendida_en: '2026-10-06T10:00:00.000Z' }];
    // Calentar: la primera vez Hoy guarda la apertura del vitral del día.
    for (const u of ['/', '/aprender', '/novenas']) await arbolDe(u);
    const antes = { hoy: await arbolDe('/'), aprender: await arbolDe('/aprender'), novenas: await arbolDe('/novenas') };
    for (const arbol of Object.values(antes)) expect(arbol.length).toBeGreaterThan(5);
    const kvAntes = { ...mockKV };
    const sqlAntes = mockSQL.escrituras;
    const escriturasAntes = mockEscriturasKV.length;

    await abrir('/configuracion');
    for (const id of ['apoyo_pequeno', 'apoyo_mediano', 'apoyo_grande'] as const) {
      await fireEvent.press(screen.getByRole('button', { name: botonAporte(id) }));
      await esperar();
      expect(screen.getByText(c.apoyo.gracias)).toBeTruthy();
    }
    expect(mockEscriturasKV.length).toBe(escriturasAntes);
    expect(mockSQL.escrituras).toBe(sqlAntes);

    const despues = { hoy: await arbolDe('/'), aprender: await arbolDe('/aprender'), novenas: await arbolDe('/novenas') };
    expect(despues).toEqual(antes);
    expect(mockKV).toEqual(kvAntes);
    expect(mockSQL.escrituras).toBe(sqlAntes);
  });

  test('con __DEV__ false: sin botones de aporte ni chip simulado; "Pronto podrás aportar…"', async () => {
    const g = globalThis as { __DEV__?: boolean };
    const original = g.__DEV__;
    g.__DEV__ = false;
    try {
      await abrir('/configuracion');
      expect(screen.getByText(c.apoyo.pronto)).toBeTruthy();
      expect(screen.queryByText(c.apoyo.simulada)).toBeNull();
      for (const id of ['apoyo_pequeno', 'apoyo_mediano', 'apoyo_grande'] as const) {
        expect(screen.queryByRole('button', { name: botonAporte(id) })).toBeNull();
      }
      // La explicación transparente se mantiene.
      expect(screen.getByText(c.apoyo.nadaSeDesbloquea)).toBeTruthy();
    } finally {
      g.__DEV__ = original;
    }
  });

  test('"Con el apoyo de…" solo si contenido.patrocinio existe; con url es un enlace que la abre', async () => {
    const prefijo = c.apoyo.patrocinio.replace('{{nombre}}', '');
    contenidoApp.patrocinio = undefined;
    await abrir('/configuracion');
    expect(textosEnOrden().some((t) => t.startsWith(prefijo))).toBe(false);

    contenidoApp.patrocinio = { nombre: { es: 'Parroquia de prueba', en: 'Test parish' } };
    await abrir('/configuracion');
    const texto = c.apoyo.patrocinio.replace('{{nombre}}', 'Parroquia de prueba');
    expect(screen.getByText(texto)).toBeTruthy();
    expect(screen.queryByRole('link', { name: texto })).toBeNull();

    const abrirUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    try {
      contenidoApp.patrocinio = { nombre: { es: 'Parroquia de prueba', en: 'Test parish' }, url: 'https://ejemplo.invalid/' };
      await abrir('/configuracion');
      await fireEvent.press(screen.getByRole('link', { name: texto }));
      expect(abrirUrl).toHaveBeenCalledWith('https://ejemplo.invalid/');
    } finally {
      abrirUrl.mockRestore();
    }
  });
});

// --- 8. Textos sin traducir ------------------------------------------------------------------------

describe('8 · Configuración en es y en sin textos sin traducir', () => {
  /** Valores que son iguales en es.json y en.json (nombres propios, formatos): pueden repetirse. */
  function hojas(o: unknown, pre = ''): Record<string, string> {
    if (typeof o === 'string') return { [pre]: o };
    return Object.entries(o as Record<string, unknown>).reduce(
      (acc, [k, v]) => ({ ...acc, ...hojas(v, pre ? `${pre}.${k}` : k) }),
      {} as Record<string, string>,
    );
  }
  const hes = hojas(es);
  const hen = hojas(en);
  const iguales = new Set(Object.keys(hes).filter((k) => hes[k] === hen[k]).map((k) => hes[k]));

  async function textosEn(idioma: 'es' | 'en') {
    await act(async () => {
      await i18n.changeLanguage(idioma);
    });
    mockKV['recordatorios.ter.2026'] = JSON.stringify({ hora: { h: 8, m: 0 }, ids: ['id-a'] });
    await abrir('/configuracion');
    // También la hoja de borrado.
    await fireEvent.press(screen.getByRole('button', { name: idioma === 'es' ? c.privacidad.borrar : ce.privacidad.borrar }));
    return textosEnOrden();
  }

  test('sin claves crudas ni {{ }} en es ni en; los textos cambian entre idiomas', async () => {
    const tes = await textosEn('es');
    const ten = await textosEn('en');
    for (const t of [...tes, ...ten]) {
      expect(t).not.toMatch(/\{\{|\}\}/);
      expect(t).not.toMatch(/^(configuracion|pantallas|acciones|app|pais|novenas|ayuda|bienvenida|aprender|idioma)\.[\w.]+$/);
    }
    expect(ten.length).toBe(tes.length);
    // Mismo árbol: en cada posición el texto debe cambiar, salvo nombres propios / valores iguales en ambos JSON.
    const permitidos = new Set([...iguales, 'Español', 'English', 'Chile', es.app.nombre, en.app.nombre]);
    const sinTraducir = tes
      .map((t, i) => [t, ten[i]] as const)
      .filter(([a, b]) => a === b && !permitidos.has(a) && !/^[\d\s:.,·]+$/.test(a));
    expect(sinTraducir).toEqual([]);
  });
});

// --- 9. Accesibilidad por código -------------------------------------------------------------------

describe('9 · accesibilidad de Configuración', () => {
  beforeEach(() => {
    mockKV['recordatorios.ter.2026'] = JSON.stringify({ hora: { h: 8, m: 0 }, ids: ['id-a'] });
  });

  test('las seis secciones son encabezados', async () => {
    await abrir('/configuracion');
    for (const titulo of Object.values(c.secciones)) expect(screen.getByRole('header', { name: titulo })).toBeTruthy();
  });

  test('interruptores: role switch, etiqueta y estado checked', async () => {
    await abrir('/configuracion');
    const sw = screen.getAllByRole('switch');
    expect(sw.length).toBeGreaterThan(0);
    for (const s of sw) {
      expect(String(s.props.accessibilityLabel ?? '')).not.toBe('');
      expect(typeof s.props.accessibilityState?.checked).toBe('boolean');
    }
  });

  test('radios: cada uno con estado; uno solo elegido por grupo', async () => {
    await abrir('/configuracion');
    const grupos = screen.container.queryAll((n) => n.props.accessibilityRole === 'radiogroup');
    expect(grupos.length).toBeGreaterThanOrEqual(4); // paleta, hora, animaciones, idioma
    for (const g of grupos) {
      const radios = g.queryAll((n) => n.props.accessibilityRole === 'radio');
      expect(radios.length).toBeGreaterThan(1);
      for (const rd of radios) expect(typeof rd.props.accessibilityState?.checked).toBe('boolean');
      expect(radios.filter((rd) => rd.props.accessibilityState.checked).length).toBe(1);
    }
  });

  test('objetivos táctiles ≥ 44 (alto) en botones, radios, interruptores y enlaces, también en la hoja', async () => {
    contenidoApp.patrocinio = { nombre: { es: 'P', en: 'P' }, url: 'https://ejemplo.invalid/' };
    await abrir('/configuracion');
    const revisar = () => {
      const chicos: string[] = [];
      let revisados = 0;
      for (const rol of ['button', 'radio', 'switch', 'link'] as const) {
        for (const b of screen.queryAllByRole(rol)) {
          revisados++;
          const s = estilo(b);
          const alto = Math.max(Number(s.minHeight ?? 0), Number(s.height ?? 0));
          if (alto < 44) chicos.push(`${rol}: ${b.props.accessibilityLabel} (${alto})`);
        }
      }
      expect(revisados).toBeGreaterThan(10);
      return chicos;
    };
    expect(revisar()).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: c.privacidad.borrar }));
    expect(revisar()).toEqual([]);
  });

  test('hoja de borrado: accessibilityViewIsModal y título como encabezado', async () => {
    await abrir('/configuracion');
    await fireEvent.press(screen.getByRole('button', { name: c.privacidad.borrar }));
    const hoja = screen.container.queryAll((n) => n.props.accessibilityViewIsModal === true);
    expect(hoja.length).toBeGreaterThan(0);
    expect(hoja[0].queryAll((n) => n.props.accessibilityRole === 'header').length).toBeGreaterThan(0);
  });

  test('"Próximamente" (política y contacto): sin rol de enlace ni de botón, sin onPress', async () => {
    await abrir('/configuracion');
    for (const titulo of [c.acercaDe.privacidad, c.acercaDe.contacto]) {
      const n = screen.getByLabelText(`${titulo}. ${c.acercaDe.proximamente}`);
      expect(['link', 'button']).not.toContain(n.props.accessibilityRole);
      expect(n.props.onPress).toBeUndefined();
      expect(n.props.onClick).toBeUndefined();
      expect(screen.queryByRole('link', { name: new RegExp(titulo) })).toBeNull();
      expect(screen.queryByRole('button', { name: new RegExp(titulo) })).toBeNull();
    }
  });
});
