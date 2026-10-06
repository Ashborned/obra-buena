/// <reference types="jest" />
/*
 * Aprender, interfaz (QA ronda 2). Complementa navegacion-aprender.test.tsx con:
 * 1. "Reducir movimiento" en el aviso de rasgo; cierre a los 4 s; anuncio; sin repetir un rasgo.
 * 2. "Reducir movimiento" en la medalla acuñada y en la medalla de la vitrina (regreso sin rebote).
 * 3. Tamaño de letra del lector guardado y leído de vuelta; extremos deshabilitados.
 * 4. Quiz: marca con ícono además del color, explicación, registrar una sola vez, reintentar sin perder.
 * 6. Accesibilidad por código: objetivos táctiles ≥ 44, etiquetas de medallas, "Próximamente".
 *
 * El progreso (`@/lib/progreso`) se reemplaza por uno en memoria; `registrarResultadoQuiz` es el real
 * envuelto en un espía. Reanimated: el mock oficial con `useReducedMotion` controlable y espías en
 * withSpring / withTiming / withSequence.
 */
import { render, screen } from '@testing-library/react-native';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import type { TestInstance } from 'test-renderer';

import datos from '../../../content/contenido.json';
import type { Contenido } from '@/contenido/tipos';
import es from '@/i18n/locales/es.json';

declare const __dirname: string;
const path = require('path') as { resolve: (...p: string[]) => string };

// --- Mocks -----------------------------------------------------------------------------------------

let mockReducir = false;
const mockKV: Record<string, string> = {};
const mockProgreso = {
  rasgos: [] as { lectura: string; rasgo: string }[],
  medallas: [] as { lectura: string; puntaje: number; ganadaEn: string }[],
  colecciones: [] as { coleccion: string; ganadaEn: string }[],
};
const mockGesto: { onChange?: (e: unknown) => void; onFinalize?: () => void } = {};

jest.mock('expo-sqlite/kv-store', () => {
  const base: Record<string, string> = { 'preferencias.bienvenida': '1', 'preferencias.idioma': 'es', 'preferencias.pais': 'CL' };
  const leer = (k: string) => (k in mockKV ? mockKV[k] : k in base ? base[k] : null);
  const escribir = (k: string, v: string) => {
    mockKV[k] = v;
  };
  const Storage = {
    getItemSync: leer,
    setItemSync: escribir,
    getItem: async (k: string) => leer(k),
    getItemAsync: async (k: string) => leer(k),
    setItem: async (k: string, v: string) => escribir(k, v),
    setItemAsync: jest.fn(async (k: string, v: string) => escribir(k, v)),
    removeItem: async (k: string) => {
      delete mockKV[k];
    },
    removeItemAsync: async (k: string) => {
      delete mockKV[k];
    },
  };
  return { __esModule: true, default: Storage, Storage };
});

// Velas de Hoy/Novenas (no se usan aquí): base vacía.
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: async () => ({
    execAsync: async () => {},
    runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
    withTransactionAsync: async (f: () => Promise<void>) => f(),
  }),
}));

// Progreso de Aprender en memoria (misma semántica que progreso.ts, probada en progreso.test.ts).
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
    const m = mockProgreso.medallas.find((x) => x.lectura === lectura);
    if (m) m.puntaje = Math.max(m.puntaje, puntaje);
    else mockProgreso.medallas.push({ lectura, puntaje, ganadaEn: new Date().toISOString() });
  }),
  medallasColeccion: jest.fn(async () => mockProgreso.colecciones.map((c) => ({ ...c }))),
  ganarMedallaColeccion: jest.fn(async (coleccion: string) => {
    if (!mockProgreso.colecciones.some((c) => c.coleccion === coleccion))
      mockProgreso.colecciones.push({ coleccion, ganadaEn: new Date().toISOString() });
  }),
  velasEncendidas: jest.fn(async () => []),
  encenderVela: jest.fn(async () => {}),
  apagarVela: jest.fn(async () => {}),
  baseProgreso: jest.fn(),
  MIGRACIONES: [],
}));

jest.mock('@/lib/aprender-progreso', () => {
  const real = jest.requireActual('@/lib/aprender-progreso');
  return { ...real, registrarResultadoQuiz: jest.fn(real.registrarResultadoQuiz) };
});

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated/mock', () => {
  const real = jest.requireActual('react-native-reanimated/mock');
  return {
    ...real,
    useReducedMotion: () => mockReducir,
    withSpring: jest.fn(real.withSpring),
    withTiming: jest.fn(real.withTiming),
    withSequence: jest.fn(real.withSequence),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const real = jest.requireActual('react-native-gesture-handler');
  const React = require('react');
  const { View: V } = require('react-native');
  const pan = () => {
    const b: Record<string, (f: never) => unknown> = {};
    b.onChange = (f) => ((mockGesto.onChange = f), b);
    b.onFinalize = (f) => ((mockGesto.onFinalize = f), b);
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

// Skia: cada componente es un View con displayName (para contar partículas `Circle`).
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

const Reanimated = require('react-native-reanimated') as typeof import('react-native-reanimated') & {
  withSpring: jest.Mock;
  withTiming: jest.Mock;
  withSequence: jest.Mock;
};
const { registrarResultadoQuiz } = require('@/lib/aprender-progreso') as { registrarResultadoQuiz: jest.Mock };

const RAIZ_APP = path.resolve(__dirname, '../app');
const contenido = datos as unknown as Contenido;
const pablo = contenido.lecturas.find((l) => l.id === 'pablo')!;
const quiz = pablo.es.quiz;
const letras = es.aprender.letrasOpciones;
const opcion = (n: number, k: number) =>
  es.aprender.opcionAccesible.replace('{{letra}}', letras.charAt(k)).replace('{{texto}}', quiz[n].o[k]);
const tam = (n: number) => es.aprender.anuncioTamano.replace('{{n}}', String(n));
const plano = (s: unknown) => (StyleSheet.flatten(s as never) ?? {}) as Record<string, unknown>;

let anunciar: jest.SpyInstance;

beforeEach(() => {
  mockReducir = false;
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  mockProgreso.rasgos = [];
  mockProgreso.medallas = [];
  mockProgreso.colecciones = [];
  delete mockGesto.onChange;
  delete mockGesto.onFinalize;
  Reanimated.withSpring.mockClear();
  Reanimated.withTiming.mockClear();
  Reanimated.withSequence.mockClear();
  registrarResultadoQuiz.mockClear();
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
  const res = (await (r as unknown as Promise<unknown>)) as { unmount: () => Promise<void> };
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  await flush();
  // Sin devolver `r` tal cual: es "thenable" y `await abrir()` lo desenvolvería.
  return { getPathname: () => r.getPathname(), unmount: () => res.unmount() };
}

/**
 * Simula el layout del lector: la vista mide `alto`, y las secciones de `visibles` (títulos) quedan
 * dentro de la pantalla; las demás, muy abajo. No se toca la cabecera (su onLayout re-renderiza).
 */
async function medirLector(visibles: string[], alto = 800) {
  const hosts = screen.container.queryAll((n) => typeof n.props.onLayout === 'function');
  const contiene = (n: TestInstance, titulo: string) =>
    n.queryAll((x) => x.type === 'Text' && x.children.some((c) => c === titulo)).length > 0;
  const masProfundo = (cands: TestInstance[]) => cands.find((c) => !cands.some((o) => o !== c && esAncestro(c, o)));
  const ev = (y: number, height: number) => ({ nativeEvent: { layout: { x: 0, y, width: 390, height } } });
  const titulos = pablo.es.secs.map((s) => s.h);
  const scroll = hosts.find((n) => n.props.scrollEventThrottle === 16)!;
  const cuerpo = masProfundo(hosts.filter((n) => n !== scroll && titulos.every((t) => contiene(n, t))))!;
  const secciones = titulos.map((t) => masProfundo(hosts.filter((n) => contiene(n, t)))!);
  expect(new Set([scroll, cuerpo, ...secciones]).size).toBe(2 + titulos.length);
  await act(async () => {
    scroll.props.onLayout(ev(0, alto));
    cuerpo.props.onLayout(ev(0, 5000));
    titulos.forEach((t, i) => secciones[i].props.onLayout(ev(visibles.includes(t) ? 0 : 10_000 + i * 1000, 100)));
  });
  await flush();
  await flush();
}

function esAncestro(a: TestInstance, b: TestInstance): boolean {
  for (let p = b.parent; p; p = p.parent) if (p === a) return true;
  return false;
}

const tituloDe = (rasgo: string) => pablo.es.secs.find((s) => s.trait === rasgo)!.h;
const nombreRasgo = (r: string) => contenido.rasgos[r].es[0];
const avisoVisible = (r: string) =>
  screen.queryAllByLabelText(new RegExp(`${nombreRasgo(r)}\\.`)).some((n) => n.props.accessibilityHint === es.aprender.cerrarAviso);

// --- 1. Aviso de rasgo -----------------------------------------------------------------------------

describe('aviso de rasgo (lector)', () => {
  test('al ver la sección se descubre, aparece el aviso y se anuncia al lector de pantalla', async () => {
    await abrir('/lectura/pablo');
    await medirLector([tituloDe('light')]);
    expect(mockProgreso.rasgos).toEqual([{ lectura: 'pablo', rasgo: 'light' }]);
    expect(avisoVisible('light')).toBe(true);
    const anuncio = es.aprender.anuncioRasgo
      .replace('{{n}}', '1')
      .replace('{{total}}', '3')
      .replace('{{nombre}}', nombreRasgo('light'))
      .replace('{{linea}}', contenido.rasgos.light.es[1]);
    expect(anunciar).toHaveBeenCalledWith(anuncio);
  });

  test('se cierra solo a los 4 s (movimiento.avisoRasgoVisible)', async () => {
    const { movimiento } = require('@/theme/movimiento');
    expect(movimiento.avisoRasgoVisible).toBe(4000);
    await abrir('/lectura/pablo');
    await medirLector([tituloDe('light')]);
    expect(avisoVisible('light')).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(3990);
    });
    expect(avisoVisible('light')).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(20);
    });
    expect(avisoVisible('light')).toBe(false);
  });

  test('tocar el aviso lo cierra antes', async () => {
    await abrir('/lectura/pablo');
    await medirLector([tituloDe('light')]);
    const boton = screen.getAllByRole('button').find((n) => n.props.accessibilityHint === es.aprender.cerrarAviso)!;
    await fireEvent.press(boton);
    expect(avisoVisible('light')).toBe(false);
  });

  test('el temporizador del aviso se limpia al desmontar', async () => {
    const r = await abrir('/lectura/pablo');
    const setT = jest.spyOn(globalThis, 'setTimeout');
    const clearT = jest.spyOn(globalThis, 'clearTimeout');
    await medirLector([tituloDe('light')]);
    const i = setT.mock.calls.findIndex((c: unknown[]) => c[1] === 4000);
    expect(i).toBeGreaterThan(-1);
    const id = setT.mock.results[i].value;
    await r.unmount();
    expect(clearT).toHaveBeenCalledWith(id);
    setT.mockRestore();
    clearT.mockRestore();
  });

  test('un rasgo ya descubierto no vuelve a avisar ni a anunciarse', async () => {
    mockProgreso.rasgos.push({ lectura: 'pablo', rasgo: 'light' });
    await abrir('/lectura/pablo');
    await medirLector([tituloDe('light')]);
    expect(avisoVisible('light')).toBe(false);
    expect(anunciar).not.toHaveBeenCalledWith(expect.stringContaining(nombreRasgo('light')));
    expect(mockProgreso.rasgos).toHaveLength(1);
  });

  test('volver a medir (scroll de ida y vuelta) no repite el aviso del mismo rasgo', async () => {
    await abrir('/lectura/pablo');
    await medirLector([tituloDe('light')]);
    await act(async () => {
      jest.advanceTimersByTime(4100);
    });
    await medirLector([tituloDe('light')]);
    expect(avisoVisible('light')).toBe(false);
    expect(anunciar.mock.calls.filter((c) => String(c[0]).includes(nombreRasgo('light')))).toHaveLength(1);
  });
});

describe('aviso de rasgo (componente): "Reducir movimiento"', () => {
  const { AvisoRasgo } = require('@/components/aviso-rasgo');
  const { ThemeProvider } = require('@/theme/ThemeProvider');

  async function montar(reducir: boolean) {
    return render(
      <ThemeProvider>
        <AvisoRasgo rasgo="light" n={1} total={3} reducir={reducir} onCerrar={() => {}} />
      </ThemeProvider>,
    );
  }
  const entrada = () => screen.container.queryAll((n) => n.props.entering !== undefined)[0].props;

  test('sin reducir: entra desde el costado con resorte (rebote) y el ícono gira y brilla', async () => {
    const springify = jest.spyOn(Reanimated.SlideInRight, 'springify');
    await montar(false);
    expect(entrada().entering).toBe(Reanimated.SlideInRight);
    expect(springify).toHaveBeenCalled();
    expect(Reanimated.withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: 700 }));
    expect(Reanimated.withSequence).toHaveBeenCalled();
    springify.mockRestore();
  });

  test('con reducir: solo fundido, sin resorte, sin giro ni brillo del ícono', async () => {
    const springify = jest.spyOn(Reanimated.SlideInRight, 'springify');
    await montar(true);
    expect(entrada().entering).toBe(Reanimated.FadeIn);
    expect(entrada().exiting).toBe(Reanimated.FadeOut);
    expect(springify).not.toHaveBeenCalled();
    expect(Reanimated.withSpring).not.toHaveBeenCalled();
    expect(Reanimated.withSequence).not.toHaveBeenCalled();
    expect(Reanimated.withTiming).not.toHaveBeenCalled();
    // El ícono queda quieto (rotate 0deg).
    const giros = screen.container
      .queryAll((n) => Array.isArray(plano(n.props.style).transform))
      .map((n) => JSON.stringify(plano(n.props.style).transform));
    expect(giros.every((g) => !/-200deg/.test(g))).toBe(true);
    springify.mockRestore();
  });

  test('es un botón con todo el texto (contador, nombre y línea) y la pista de cerrar', async () => {
    await montar(true);
    const b = screen.getByRole('button');
    expect(b.props.accessibilityLabel).toBe(
      `${es.aprender.rasgoDescubierto.replace('{{n}}', '1').replace('{{total}}', '3')}. ${nombreRasgo('light')}. ${contenido.rasgos.light.es[1]}`,
    );
    expect(b.props.accessibilityHint).toBe(es.aprender.cerrarAviso);
    expect(plano(b.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });
});

// --- 2. Medalla ------------------------------------------------------------------------------------

describe('medalla acuñada: "Reducir movimiento"', () => {
  const { MedallaAcunada } = require('@/components/acunacion');
  const { ThemeProvider } = require('@/theme/ThemeProvider');

  async function montar(reducir: boolean) {
    return render(
      <ThemeProvider>
        <MedallaAcunada tamano={190} reducir={reducir} activo>
          <View testID="medalla" />
        </MedallaAcunada>
      </ThemeProvider>,
    );
  }
  const circulos = () => screen.queryAllByTestId('skia-Circle').length;
  const estiloMedalla = () => plano(screen.getByTestId('medalla').parent!.props.style);

  test('sin reducir: giro 3D (rotateY), rayos que giran y partículas', async () => {
    await montar(false);
    expect(circulos()).toBeGreaterThan(0);
    expect(JSON.stringify(estiloMedalla().transform)).toMatch(/rotateY/);
    expect(Reanimated.withTiming).toHaveBeenCalledWith(Math.PI / 2, expect.objectContaining({ duration: 6000 }));
  });

  test('con reducir: sin giro 3D, sin rayos girando ni partículas; solo fundido', async () => {
    await montar(true);
    expect(circulos()).toBe(0);
    const e = estiloMedalla();
    expect(e.transform).toBeUndefined();
    expect(e.opacity).toBeDefined();
    const duraciones = Reanimated.withTiming.mock.calls.map((c) => c[1]?.duration);
    expect(duraciones.every((d) => d === 400)).toBe(true);
    expect(Reanimated.withTiming).not.toHaveBeenCalledWith(Math.PI / 2, expect.anything());
  });
});

describe('medalla de la vitrina (/medalla/[id])', () => {
  beforeEach(() => {
    mockProgreso.medallas.push({ lectura: 'pablo', puntaje: 5, ganadaEn: '2026-10-01T12:00:00.000Z' });
    mockProgreso.rasgos.push(
      { lectura: 'pablo', rasgo: 'light' },
      { lectura: 'pablo', rasgo: 'book' },
      { lectura: 'pablo', rasgo: 'sword' },
    );
  });

  test('sin reducir: al soltar vuelve con resorte', async () => {
    await abrir('/medalla/pablo');
    expect(mockGesto.onFinalize).toBeDefined();
    Reanimated.withSpring.mockClear();
    Reanimated.withTiming.mockClear();
    await act(async () => mockGesto.onFinalize!());
    expect(Reanimated.withSpring).toHaveBeenCalledTimes(2);
  });

  test('con reducir: al soltar vuelve sin rebote (withTiming, sin withSpring)', async () => {
    mockReducir = true;
    await abrir('/medalla/pablo');
    expect(mockGesto.onFinalize).toBeDefined();
    Reanimated.withSpring.mockClear();
    Reanimated.withTiming.mockClear();
    await act(async () => mockGesto.onFinalize!());
    expect(Reanimated.withSpring).not.toHaveBeenCalled();
    expect(Reanimated.withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: 250 }));
  });

  test('la medalla grande tiene etiqueta para el lector de pantalla', async () => {
    await abrir('/medalla/pablo');
    expect(
      screen.getAllByLabelText(es.aprender.medallaGanadaAccesible.replace('{{nombre}}', pablo.es.name)).length,
    ).toBeGreaterThan(0);
  });
});

// --- 3. Tamaño de letra ----------------------------------------------------------------------------

describe('tamaño de letra del lector', () => {
  const mayor = () => screen.getByRole('button', { name: es.aprender.letraMayor });
  const menor = () => screen.getByRole('button', { name: es.aprender.letraMenor });

  test('A+ y A− cambian el tamaño, lo guardan y se anuncia', async () => {
    await abrir('/lectura/pablo');
    expect(mayor().props.accessibilityValue).toEqual({ text: tam(17) });
    await fireEvent.press(mayor());
    expect(mockKV['preferencias.letraLector']).toBe('19');
    expect(mayor().props.accessibilityValue).toEqual({ text: tam(19) });
    expect(anunciar).toHaveBeenCalledWith(tam(19));
    await fireEvent.press(menor());
    await fireEvent.press(menor());
    expect(mockKV['preferencias.letraLector']).toBe('15');
    expect(menor().props.accessibilityValue).toEqual({ text: tam(15) });
  });

  test('al reabrir el lector se lee el tamaño guardado', async () => {
    const r = await abrir('/lectura/pablo');
    await fireEvent.press(mayor());
    await fireEvent.press(mayor());
    expect(mockKV['preferencias.letraLector']).toBe('21');
    await r.unmount();
    await abrir('/lectura/pablo');
    expect(mayor().props.accessibilityValue).toEqual({ text: tam(21) });
  });

  test('en 15, A− está deshabilitado y A+ no', async () => {
    mockKV['preferencias.letraLector'] = '15';
    await abrir('/lectura/pablo');
    expect(menor().props.accessibilityState).toMatchObject({ disabled: true });
    expect(mayor().props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(menor());
    expect(mockKV['preferencias.letraLector']).toBe('15');
  });

  test('en 23, A+ está deshabilitado y no guarda nada más', async () => {
    mockKV['preferencias.letraLector'] = '23';
    await abrir('/lectura/pablo');
    expect(mayor().props.accessibilityState).toMatchObject({ disabled: true });
    expect(menor().props.accessibilityState).toMatchObject({ disabled: false });
  });

  test('A− y A+ miden al menos 44 de alto y de ancho', async () => {
    await abrir('/lectura/pablo');
    for (const b of [mayor(), menor()]) {
      const s = plano(typeof b.props.style === 'function' ? b.props.style({ pressed: false }) : b.props.style);
      expect(s.minHeight).toBeGreaterThanOrEqual(44);
      expect(s.minWidth).toBeGreaterThanOrEqual(44);
    }
  });
});

// --- 4. Quiz ---------------------------------------------------------------------------------------

async function responder(n: number, k: number) {
  await fireEvent.press(screen.getByRole('button', { name: opcion(n, k) }));
  await flush();
  const ultima = n === quiz.length - 1;
  await fireEvent.press(screen.getByRole('button', { name: ultima ? es.aprender.verResultado : es.aprender.siguiente }));
  await flush();
}
/** Íconos (SymbolView) con ese nombre de SF Symbol (o el de Android/web). */
const iconos = (sf: string) =>
  screen.container.queryAll((n) => {
    const nm = n.props.name;
    return nm === sf || (nm && typeof nm === 'object' && nm.ios === sf);
  });
const malo = (n: number) => (quiz[n].a + 1) % quiz[n].o.length;

describe('quiz en la interfaz', () => {
  test('al elegir mal: ícono de correcta e incorrecta (no solo color), explicación y Siguiente', async () => {
    await abrir('/quiz/pablo');
    expect(iconos('checkmark')).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: opcion(0, malo(0)) }));
    expect(iconos('checkmark')).toHaveLength(1);
    expect(iconos('xmark')).toHaveLength(1);
    expect(screen.getByText(quiz[0].e)).toBeTruthy();
    expect(screen.getByText(es.aprender.noEraEsa)).toBeTruthy();
    expect(screen.getByRole('button', { name: es.aprender.siguiente })).toBeTruthy();
    expect(anunciar).toHaveBeenCalledWith(`${es.aprender.noEraEsa} ${quiz[0].e}`);
  });

  test('al elegir bien: solo el ícono de correcta; todas las alternativas quedan deshabilitadas', async () => {
    await abrir('/quiz/pablo');
    await fireEvent.press(screen.getByRole('button', { name: opcion(0, quiz[0].a) }));
    expect(iconos('checkmark')).toHaveLength(1);
    expect(iconos('xmark')).toHaveLength(0);
    expect(screen.getByText(es.aprender.correcto)).toBeTruthy();
    const alternativas = screen
      .getAllByRole('button')
      .filter((b) => quiz[0].o.some((o) => String(b.props.accessibilityLabel ?? '').includes(o)));
    expect(alternativas).toHaveLength(4);
    for (const b of alternativas) expect(b.props.accessibilityState).toMatchObject({ disabled: true });
  });

  test('sin respuesta no hay Siguiente; en la última aparece "Ver resultado"', async () => {
    await abrir('/quiz/pablo');
    expect(screen.queryByRole('button', { name: es.aprender.siguiente })).toBeNull();
    for (let n = 0; n < quiz.length - 1; n++) await responder(n, quiz[n].a);
    await fireEvent.press(screen.getByRole('button', { name: opcion(4, quiz[4].a) }));
    expect(screen.getByRole('button', { name: es.aprender.verResultado })).toBeTruthy();
    expect(screen.queryByRole('button', { name: es.aprender.siguiente })).toBeNull();
  });

  test('alternativas: objetivo táctil ≥ 44', async () => {
    await abrir('/quiz/pablo');
    const b = screen.getByRole('button', { name: opcion(0, 0) });
    const s = plano(typeof b.props.style === 'function' ? b.props.style({ pressed: false }) : b.props.style);
    expect(s.minHeight).toBeGreaterThanOrEqual(44);
  });

  test('aprobar llama registrarResultadoQuiz una sola vez y guarda la medalla', async () => {
    await abrir('/quiz/pablo');
    for (let n = 0; n < quiz.length; n++) await responder(n, quiz[n].a);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await flush();
    expect(screen.getByText(es.aprender.ganaste)).toBeTruthy();
    expect(registrarResultadoQuiz).toHaveBeenCalledTimes(1);
    expect(registrarResultadoQuiz.mock.calls[0][0].id).toBe('pablo');
    expect(registrarResultadoQuiz.mock.calls[0][1]).toBe(5);
    expect(mockProgreso.medallas.map((m) => [m.lectura, m.puntaje])).toEqual([['pablo', 5]]);
    expect(anunciar).toHaveBeenCalledWith(
      es.aprender.anuncioMedalla.replace('{{nombre}}', pablo.es.name).replace('{{n}}', '5').replace('{{total}}', '5'),
    );
  });

  test('reprobar → "Volver a intentarlo" reinicia sin perder la medalla previa', async () => {
    mockProgreso.medallas.push({ lectura: 'pablo', puntaje: 4, ganadaEn: '2026-10-01T12:00:00.000Z' });
    const antes = JSON.stringify(mockProgreso);
    await abrir('/quiz/pablo');
    for (let n = 0; n < quiz.length; n++) await responder(n, n < 3 ? quiz[n].a : malo(n));
    await flush();
    expect(screen.getByText(es.aprender.casi)).toBeTruthy();
    expect(registrarResultadoQuiz).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mockProgreso)).toBe(antes);

    await fireEvent.press(screen.getByRole('button', { name: es.aprender.reintentar }));
    await flush();
    expect(screen.getByText(es.aprender.preguntaDe.replace('{{n}}', '1').replace('{{total}}', '5'))).toBeTruthy();
    // Sin respuestas marcadas: ningún ícono de correcta/incorrecta.
    expect(iconos('checkmark')).toHaveLength(0);
    expect(JSON.stringify(mockProgreso)).toBe(antes);

    // Segundo intento aprobado: un registro más (uno por intento), conserva la fecha original.
    for (let n = 0; n < quiz.length; n++) await responder(n, quiz[n].a);
    await flush();
    expect(registrarResultadoQuiz).toHaveBeenCalledTimes(2);
    expect(mockProgreso.medallas).toEqual([{ lectura: 'pablo', puntaje: 5, ganadaEn: '2026-10-01T12:00:00.000Z' }]);
  });

  test('sin temporizador: dejar pasar 10 minutos en una pregunta no cambia nada', async () => {
    await abrir('/quiz/pablo');
    await act(async () => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(screen.getByText(es.aprender.preguntaDe.replace('{{n}}', '1').replace('{{total}}', '5'))).toBeTruthy();
    expect(screen.getByRole('button', { name: opcion(0, 0) }).props.accessibilityState).toMatchObject({ disabled: false });
    expect(registrarResultadoQuiz).not.toHaveBeenCalled();
  });
});

// --- 6. Vitrina y colecciones ---------------------------------------------------------------------

describe('pestaña Aprender: accesibilidad', () => {
  test('medallas de la vitrina: etiqueta, pista y objetivo ≥ 44', async () => {
    mockProgreso.medallas.push({ lectura: 'pedro', puntaje: 5, ganadaEn: '2026-10-01T12:00:00.000Z' });
    await abrir('/aprender');
    const ganada = screen.getByRole('button', { name: es.aprender.medallaGanadaAccesible.replace('{{nombre}}', contenido.lecturas.find((l) => l.id === 'pedro')!.es.name) });
    expect(ganada.props.accessibilityHint).toBe(es.aprender.medallaGanadaPista);
    const pendiente = screen.getByRole('button', { name: es.aprender.medallaPendienteAccesible.replace('{{nombre}}', pablo.es.name) });
    expect(pendiente.props.accessibilityHint).toBe(es.aprender.medallaPendientePista);
    for (const b of [ganada, pendiente]) {
      const s = plano(typeof b.props.style === 'function' ? b.props.style({ pressed: false }) : b.props.style);
      expect(s.minHeight).toBeGreaterThanOrEqual(44);
      expect(s.width ?? 44).toBeGreaterThanOrEqual(44);
    }
  });

  test('"Próximamente": deshabilitado, anunciado y sin acción', async () => {
    const r = await abrir('/aprender');
    for (const p of contenido.proximamente.filter((x) => contenido.colecciones.some((c) => c.items.includes(x.id)))) {
      const n = screen.getByLabelText(`${p.es.name}. ${p.es.sub}. ${es.aprender.proximamente}`);
      expect(n.props.accessibilityState).toEqual({ disabled: true });
      expect(n.props.onPress).toBeUndefined();
    }
    await fireEvent.press(screen.getAllByLabelText(new RegExp(`${es.aprender.proximamente}$`))[0]);
    expect(r.getPathname()).toBe('/aprender');
  });
});
