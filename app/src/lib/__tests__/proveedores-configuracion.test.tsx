/// <reference types="jest" />
/*
 * Hito 7 · Proveedores que Configuración cambia en caliente:
 * - ThemeProvider: la hora fija manda sobre el reloj; 'auto' sigue al reloj; persiste al remontar.
 * - AnimacionesProvider / useReducirMovimiento: sistema O preferencia 'reducidas';
 *   ReducedMotionConfig (Always) solo con 'reducidas'.
 * - ReinicioProvider / useReiniciar: vuelve a montar los hijos (un useState(leer…) relee).
 *
 * kv-store simulado y persistente entre montajes; Reanimated simulado con "Reducir movimiento"
 * del sistema controlable.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

const mockKV: Record<string, string> = {};
jest.mock('expo-sqlite/kv-store', () => {
  const Storage = {
    getItemSync: (k: string) => (k in mockKV ? mockKV[k] : null),
    setItemAsync: async (k: string, v: string) => {
      mockKV[k] = v;
    },
  };
  return { __esModule: true, default: Storage, Storage };
});

let mockSistemaReduce = false;
const mockConfigs: string[] = [];
jest.mock('react-native-reanimated', () => ({
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  useReducedMotion: () => mockSistemaReduce,
  ReducedMotionConfig: ({ mode }: { mode: string }) => {
    mockConfigs.push(mode);
    return null;
  },
}));

import { AnimacionesProvider, usePreferenciaAnimaciones, useReducirMovimiento } from '../animaciones';
import { leerPaleta } from '../preferencias';
import { ReinicioProvider, useReiniciar } from '../reinicio';
import { ThemeProvider, useTema } from '@/theme/ThemeProvider';

const esperar = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  mockSistemaReduce = false;
  mockConfigs.length = 0;
});

// --- Tema ------------------------------------------------------------------------------------

function HoraVisible() {
  const t = useTema();
  return (
    <>
      <Text testID="hora">{t.hora}</Text>
      <Text testID="pref">{t.preferenciaHora}</Text>
      <Pressable testID="fijar-noche" onPress={() => t.setPreferenciaHora('night')} />
      <Pressable testID="auto" onPress={() => t.setPreferenciaHora('auto')} />
    </>
  );
}

describe('ThemeProvider: hora fija vs. automática', () => {
  afterEach(() => jest.useRealTimers());

  const relojA = (h: number) =>
    jest.useFakeTimers({ now: new Date(2026, 9, 5, h, 0), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });

  test.each([
    [8, 'day'],
    [15, 'dusk'],
    [22, 'night'],
  ])("'auto' a las %p:00 → %p", async (h, hora) => {
    relojA(h);
    await render(
      <ThemeProvider>
        <HoraVisible />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('pref').props.children).toBe('auto');
    expect(screen.getByTestId('hora').props.children).toBe(hora);
  });

  test.each(['day', 'dusk', 'night'] as const)('guardada %p: a mediodía y a medianoche sigue igual', async (fija) => {
    mockKV['preferencias.hora'] = fija;
    for (const h of [0, 12]) {
      relojA(h);
      const r = await render(
        <ThemeProvider>
          <HoraVisible />
        </ThemeProvider>,
      );
      expect(screen.getByTestId('hora').props.children).toBe(fija);
      await r.unmount();
    }
  });

  test('fijar "night" a las 08:00 cambia en el momento, se guarda y sobrevive a remontar; volver a auto sigue al reloj', async () => {
    relojA(8);
    const r = await render(
      <ThemeProvider>
        <HoraVisible />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('hora').props.children).toBe('day');
    await fireEvent.press(screen.getByTestId('fijar-noche'));
    expect(screen.getByTestId('hora').props.children).toBe('night');
    expect(mockKV['preferencias.hora']).toBe('night');
    await r.unmount();
    await render(
      <ThemeProvider>
        <HoraVisible />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('hora').props.children).toBe('night');
    await fireEvent.press(screen.getByTestId('auto'));
    expect(screen.getByTestId('hora').props.children).toBe('day');
    expect(mockKV['preferencias.hora']).toBe('auto');
  });
});

// --- Animaciones -----------------------------------------------------------------------------

function Movimiento() {
  const reducir = useReducirMovimiento();
  return <Text testID="reducir">{String(reducir)}</Text>;
}

function Selector() {
  const { preferencia, setPreferencia } = usePreferenciaAnimaciones();
  return (
    <>
      <Text testID="preferencia">{preferencia}</Text>
      <Pressable testID="reducidas" onPress={() => setPreferencia('reducidas')} />
      <Pressable testID="sistema" onPress={() => setPreferencia('sistema')} />
    </>
  );
}

const arbolAnimaciones = () => (
  <AnimacionesProvider>
    <Selector />
    <Movimiento />
  </AnimacionesProvider>
);
const reducir = () => screen.getByTestId('reducir').props.children;

describe('useReducirMovimiento = sistema O preferencia "reducidas"', () => {
  test.each([
    [false, 'sistema', 'false'],
    [true, 'sistema', 'true'],
    [false, 'reducidas', 'true'],
    [true, 'reducidas', 'true'],
  ])('sistema=%p, preferencia=%p → %p', async (sistema, pref, esperado) => {
    mockSistemaReduce = sistema;
    if (pref === 'reducidas') mockKV['preferencias.animaciones'] = 'reducidas';
    await render(arbolAnimaciones());
    expect(screen.getByTestId('preferencia').props.children).toBe(pref);
    expect(reducir()).toBe(esperado);
  });

  test('fuera del proveedor: solo el sistema (no lanza)', async () => {
    mockSistemaReduce = false;
    await render(<Movimiento />);
    expect(reducir()).toBe('false');
    mockSistemaReduce = true;
    await render(<Movimiento />);
    expect(screen.getAllByTestId('reducir').at(-1)!.props.children).toBe('true');
  });

  test('ReducedMotionConfig: no se monta con "sistema"; con "reducidas" se monta en Always', async () => {
    await render(arbolAnimaciones());
    expect(mockConfigs).toEqual([]);
    await fireEvent.press(screen.getByTestId('reducidas'));
    expect(reducir()).toBe('true');
    expect(mockConfigs.length).toBeGreaterThan(0);
    expect(new Set(mockConfigs)).toEqual(new Set(['always']));
  });

  test('elegir "Reducidas" se guarda y sobrevive al reinicio; "Según el sistema" lo deshace', async () => {
    const r = await render(arbolAnimaciones());
    await fireEvent.press(screen.getByTestId('reducidas'));
    await esperar();
    expect(mockKV['preferencias.animaciones']).toBe('reducidas');
    await r.unmount();
    mockConfigs.length = 0;
    const r2 = await render(arbolAnimaciones());
    expect(reducir()).toBe('true');
    expect(mockConfigs).toContain('always');
    await fireEvent.press(screen.getByTestId('sistema'));
    expect(reducir()).toBe('false');
    await r2.unmount();
    mockConfigs.length = 0;
    await render(arbolAnimaciones());
    expect(reducir()).toBe('false');
    expect(mockConfigs).toEqual([]);
  });

  test('usePreferenciaAnimaciones fuera del proveedor lanza un error claro', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Selector />)).rejects.toThrow(/AnimacionesProvider/);
    spy.mockRestore();
  });
});

// --- Reinicio --------------------------------------------------------------------------------

let mockMontajes = 0;
function LeePaleta() {
  const [paleta] = useState(leerPaleta);
  const [montaje] = useState(() => ++mockMontajes);
  const reiniciar = useReiniciar();
  return (
    <>
      <Text testID="paleta">{paleta}</Text>
      <Text testID="montaje">{montaje}</Text>
      <Pressable testID="reiniciar" onPress={reiniciar} />
    </>
  );
}

describe('ReinicioProvider / useReiniciar', () => {
  beforeEach(() => {
    mockMontajes = 0;
  });

  test('reiniciar vuelve a montar los hijos: useState(leer…) relee el almacenamiento', async () => {
    mockKV['preferencias.paleta'] = 'vitral';
    await render(
      <ReinicioProvider>
        <LeePaleta />
      </ReinicioProvider>,
    );
    expect(screen.getByTestId('paleta').props.children).toBe('vitral');
    expect(screen.getByTestId('montaje').props.children).toBe(1);

    // "Borrar mis datos": se vacía el almacenamiento; sin reiniciar, el estado sigue viejo.
    delete mockKV['preferencias.paleta'];
    expect(screen.getByTestId('paleta').props.children).toBe('vitral');

    await fireEvent.press(screen.getByTestId('reiniciar'));
    expect(screen.getByTestId('montaje').props.children).toBe(2);
    expect(screen.getByTestId('paleta').props.children).toBe('rosaMistica');
  });

  test('reiniciar dos veces monta dos veces más (la clave cambia cada vez)', async () => {
    await render(
      <ReinicioProvider>
        <LeePaleta />
      </ReinicioProvider>,
    );
    for (const n of [2, 3]) {
      await fireEvent.press(screen.getByTestId('reiniciar'));
      expect(screen.getByTestId('montaje').props.children).toBe(n);
    }
  });

  test('los proveedores dentro también se vuelven a montar (tema y animaciones releen)', async () => {
    mockKV['preferencias.animaciones'] = 'reducidas';
    mockKV['preferencias.hora'] = 'night';
    function Boton() {
      const r = useReiniciar();
      return <Pressable testID="reiniciar" onPress={r} />;
    }
    await render(
      <ReinicioProvider>
        <ThemeProvider>
          <AnimacionesProvider>
            <HoraVisible />
            <Movimiento />
            <Boton />
          </AnimacionesProvider>
        </ThemeProvider>
      </ReinicioProvider>,
    );
    expect(reducir()).toBe('true');
    expect(screen.getByTestId('pref').props.children).toBe('night');
    for (const k of Object.keys(mockKV)) delete mockKV[k];
    await fireEvent.press(screen.getByTestId('reiniciar'));
    expect(reducir()).toBe('false');
    expect(screen.getByTestId('pref').props.children).toBe('auto');
  });

  test('useReiniciar fuera del proveedor lanza un error claro', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<LeePaleta />)).rejects.toThrow(/ReinicioProvider/);
    spy.mockRestore();
  });
});
