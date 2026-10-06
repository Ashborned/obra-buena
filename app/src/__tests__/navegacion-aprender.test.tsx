/// <reference types="jest" />
/*
 * Pestaña Aprender con renderRouter (mocks como en navegacion-novenas.test.tsx): vitrina, colecciones
 * con las del país primero, tarjeta → lector, tamaño de letra del lector, y quiz → resultado
 * (aprobar y reprobar, con "Volver a intentarlo"). Sin temporizador en ningún paso.
 */
import { screen } from '@testing-library/react-native';
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
const pablo = contenido.lecturas.find((l) => l.id === 'pablo')!;
const quiz = pablo.es.quiz;
const letras = es.aprender.letrasOpciones;
const opcion = (k: number) =>
  es.aprender.opcionAccesible.replace('{{letra}}', letras.charAt(k)).replace('{{texto}}', quiz[0].o[k]);

async function abrir(url: string) {
  jest.useFakeTimers({ now: new Date(2026, 9, 5, 10, 0) });
  const r = renderRouter(RAIZ_APP, { initialUrl: url });
  await (r as unknown as Promise<unknown>);
  await correr();
  return { getPathname: () => r.getPathname() };
}

async function correr() {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
}

/** Responde la pregunta actual con la alternativa `k` y pasa a la siguiente. */
async function responder(k: number, n: number) {
  const p = quiz[n];
  const etiqueta = es.aprender.opcionAccesible.replace('{{letra}}', letras.charAt(k)).replace('{{texto}}', p.o[k]);
  await fireEvent.press(screen.getByRole('button', { name: etiqueta }));
  await correr();
  const ultima = n === quiz.length - 1;
  await fireEvent.press(screen.getByRole('button', { name: ultima ? es.aprender.verResultado : es.aprender.siguiente }));
  await correr();
}

afterEach(() => {
  jest.useRealTimers();
  mockPais = 'CL';
});

describe('Aprender', () => {
  test('vitrina con su contador y colecciones; con país CL, "Santos de Chile" va primero', async () => {
    mockPais = 'CL';
    await abrir('/aprender');
    expect(screen.getByText(es.aprender.vitrina)).toBeTruthy();
    expect(screen.getByText(`0 de ${contenido.lecturas.length} medallas`)).toBeTruthy();
    const cabeceras = screen.getAllByRole('header').map((h) => h.props.accessibilityLabel ?? '');
    const chile = cabeceras.findIndex((c: string) => c.startsWith('Santos de Chile'));
    const apostoles = cabeceras.findIndex((c: string) => c.startsWith('Apóstoles'));
    expect(chile).toBeGreaterThan(-1);
    expect(chile).toBeLessThan(apostoles);
  });

  test('"Próximamente" se ve deshabilitado y una lectura abre el lector', async () => {
    const r = await abrir('/aprender');
    const andres = screen.getByLabelText(/^San Andrés\./);
    expect(andres.props.accessibilityState).toEqual({ disabled: true });
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${pablo.es.name}\. ${pablo.es.sub}`) }));
    await correr();
    expect(r.getPathname()).toBe('/lectura/pablo');
    expect(screen.getByRole('header', { name: pablo.es.name })).toBeTruthy();
  });

  test('lector: A+ sube la letra hasta 23 y luego se deshabilita', async () => {
    await abrir('/lectura/pablo');
    const mayor = () => screen.getByRole('button', { name: es.aprender.letraMayor });
    for (let i = 0; i < 4; i++) {
      await fireEvent.press(mayor());
      await correr();
    }
    expect(mayor().props.accessibilityState).toMatchObject({ disabled: true });
    expect(mayor().props.accessibilityValue).toEqual({ text: es.aprender.anuncioTamano.replace('{{n}}', '23') });
  });

  test('quiz: al elegir se marca la correcta; con todas bien se gana la medalla', async () => {
    await abrir('/quiz/pablo');
    expect(screen.getByText(es.aprender.preguntaDe.replace('{{n}}', '1').replace('{{total}}', '5'))).toBeTruthy();
    const mala = quiz[0].a === 0 ? 1 : 0;
    await fireEvent.press(screen.getByRole('button', { name: opcion(mala) }));
    await correr();
    expect(screen.getByText(es.aprender.noEraEsa)).toBeTruthy();
    expect(screen.getByRole('button', { name: es.aprender.opcionCorrecta.replace('{{opcion}}', opcion(quiz[0].a)) })).toBeTruthy();
    // Una respuesta marcada no se cambia.
    expect(screen.getByRole('button', { name: es.aprender.opcionIncorrecta.replace('{{opcion}}', opcion(mala)) }).props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('button', { name: es.aprender.siguiente }));
    await correr();
    for (let n = 1; n < quiz.length; n++) await responder(quiz[n].a, n);
    expect(screen.getByText(es.aprender.ganaste)).toBeTruthy();
    expect(screen.getByText(es.aprender.acertaste.replace('{{n}}', '4').replace('{{total}}', '5'))).toBeTruthy();
  });

  test('quiz: con 3 de 5 no se gana; "Volver a intentarlo" empieza de nuevo', async () => {
    await abrir('/quiz/pablo');
    for (let n = 0; n < quiz.length; n++) await responder(n < 3 ? quiz[n].a : (quiz[n].a + 1) % quiz[n].o.length, n);
    expect(screen.getByText(es.aprender.acertaste.replace('{{n}}', '3').replace('{{total}}', '5'))).toBeTruthy();
    expect(screen.getByText(es.aprender.casi)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: es.aprender.reintentar }));
    await correr();
    expect(screen.getByText(es.aprender.preguntaDe.replace('{{n}}', '1').replace('{{total}}', '5'))).toBeTruthy();
  });
});
