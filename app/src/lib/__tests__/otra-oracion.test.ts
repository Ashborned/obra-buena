/// <reference types="jest" />
/*
 * "Otra oración": desplazamiento por emoción solo en memoria (docs/decisiones.md, 2026-10-03;
 * CLAUDE.md principio 1: no se guarda ni se cuenta).
 */
import { act, renderHook } from '@testing-library/react-native';

import { desplazamientoDe, otraOracion, reiniciarOtraOracion, useOtraOracion } from '../otra-oracion';

// Sin @types/node en el proyecto (misma convención que region.test.ts).
declare const __dirname: string;
const fs = require('fs') as { readFileSync(f: string, enc: 'utf8'): string };
const path = require('path') as { resolve(...p: string[]): string };

beforeEach(() => {
  reiniciarOtraOracion();
});

describe('desplazamientoDe / otraOracion / reiniciarOtraOracion', () => {
  test('empieza en 0', () => {
    expect(desplazamientoDe('sad')).toBe(0);
    expect(desplazamientoDe('no-existe')).toBe(0);
  });

  test('otraOracion suma 1 cada vez', () => {
    otraOracion('sad');
    expect(desplazamientoDe('sad')).toBe(1);
    otraOracion('sad');
    otraOracion('sad');
    expect(desplazamientoDe('sad')).toBe(3);
  });

  test('solo afecta a esa emoción', () => {
    otraOracion('sad');
    otraOracion('sad');
    otraOracion('lonely');
    expect(desplazamientoDe('sad')).toBe(2);
    expect(desplazamientoDe('lonely')).toBe(1);
    expect(desplazamientoDe('depression')).toBe(0);
    expect(desplazamientoDe('happy')).toBe(0);
  });

  test('reiniciarOtraOracion vuelve todo a 0', () => {
    otraOracion('sad');
    otraOracion('happy');
    reiniciarOtraOracion();
    expect(desplazamientoDe('sad')).toBe(0);
    expect(desplazamientoDe('happy')).toBe(0);
  });
});

describe('useOtraOracion', () => {
  test('devuelve [0, avanzar] y re-renderiza al avanzar', async () => {
    let renders = 0;
    const { result } = await renderHook(() => {
      renders++;
      return useOtraOracion('sad');
    });
    expect(result.current[0]).toBe(0);
    const antes = renders;
    await act(async () => {
      result.current[1]();
    });
    expect(result.current[0]).toBe(1);
    expect(renders).toBeGreaterThan(antes);
    await act(async () => {
      result.current[1]();
    });
    expect(result.current[0]).toBe(2);
    expect(desplazamientoDe('sad')).toBe(2);
  });

  test('se entera de cambios hechos fuera del hook y de reiniciarOtraOracion', async () => {
    const { result } = await renderHook(() => useOtraOracion('lonely'));
    await act(async () => {
      otraOracion('lonely');
    });
    expect(result.current[0]).toBe(1);
    await act(async () => {
      reiniciarOtraOracion();
    });
    expect(result.current[0]).toBe(0);
  });

  test('avanzar en una emoción no cambia el hook de otra', async () => {
    const sad = await renderHook(() => useOtraOracion('sad'));
    const happy = await renderHook(() => useOtraOracion('happy'));
    await act(async () => {
      sad.result.current[1]();
    });
    expect(sad.result.current[0]).toBe(1);
    expect(happy.result.current[0]).toBe(0);
  });

  test('avanzar es estable entre renders para la misma emoción', async () => {
    const { result, rerender } = await renderHook((p: { id: string }) => useOtraOracion(p.id), {
      initialProps: { id: 'sad' },
    });
    const f1 = result.current[1];
    await rerender({ id: 'sad' });
    expect(result.current[1]).toBe(f1);
    await rerender({ id: 'lonely' });
    expect(result.current[1]).not.toBe(f1);
    expect(result.current[0]).toBe(0);
  });
});

describe('no persiste', () => {
  const fuente = fs.readFileSync(path.resolve(__dirname, '../otra-oracion.ts'), 'utf8');
  const importaciones = [...fuente.matchAll(/(?:from\s+|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]);

  test('solo importa react y la rotación pura (./emociones), que tampoco guarda nada', () => {
    expect([...importaciones].sort()).toEqual(['./emociones', 'react']);
  });

  test.each(['kv-store', 'sqlite', 'async-storage', 'preferencias', 'progreso', 'fetch', 'localStorage'])(
    'no menciona %s',
    (palabra) => {
      expect(fuente).not.toMatch(new RegExp(palabra, 'i'));
    },
  );

  test('al "reabrir" el módulo (registro nuevo) vuelve a 0', () => {
    otraOracion('sad');
    jest.isolateModules(() => {
      const m = require('../otra-oracion') as typeof import('../otra-oracion');
      expect(m.desplazamientoDe('sad')).toBe(0);
    });
  });
});

describe('"Otra oración" vuelve a 0 al cambiar el día', () => {
  test('el desplazamiento de hoy no pasa a mañana', () => {
    reiniciarOtraOracion();
    const hoy = new Date(2026, 9, 3, 23, 59);
    const manana = new Date(2026, 9, 4, 0, 0);
    otraOracion('sad', hoy);
    otraOracion('sad', hoy);
    expect(desplazamientoDe('sad', hoy)).toBe(2);
    expect(desplazamientoDe('sad', manana)).toBe(0);
    otraOracion('sad', manana);
    expect(desplazamientoDe('sad', manana)).toBe(1);
    expect(desplazamientoDe('sad', hoy)).toBe(0);
  });
});
