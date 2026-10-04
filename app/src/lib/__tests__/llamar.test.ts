/// <reference types="jest" />
/*
 * Llamar a una línea de ayuda (docs/decisiones.md, 2026-10-03): `tel:` abre el marcador, nunca
 * llama sola; `#` → `%23`; en iOS los números con `*` o `#` se muestran para marcar a mano.
 */
import { Linking, Platform } from 'react-native';

import datos from '../../../../content/contenido.json';
import type { Contenido } from '@/contenido/tipos';

import { abrirMarcador, prepararLlamada, urlTel } from '../llamar';

// Sin @types/node en el proyecto (misma convención que region.test.ts).
declare const __dirname: string;
const fs = require('fs') as { readFileSync(f: string, enc: 'utf8'): string };
const path = require('path') as { resolve(...p: string[]): string };

const real = datos as unknown as Contenido;
const lineas = real.ayuda.paises.flatMap((p) => p.lineas.map((l) => ({ pais: p.pais, ...l })));

describe('urlTel', () => {
  test("'*4141' → 'tel:*4141' (el * va tal cual)", () => {
    expect(urlTel('*4141')).toBe('tel:*4141');
  });
  test("'#' se codifica: '*123#' → 'tel:*123%23'", () => {
    expect(urlTel('*123#')).toBe('tel:*123%23');
    expect(urlTel('#1#2')).toBe('tel:%231%232');
  });
  test("'+' va tal cual", () => {
    expect(urlTel('+56223456789')).toBe('tel:+56223456789');
  });
});

describe('prepararLlamada', () => {
  test.each([
    ['+56 2 2345 6789', '+56223456789'],
    ['+56-2-2345-6789', '+56223456789'],
    ['+56 (2) 2345-6789', '+56223456789'],
    ['(011) 5275-1135', '01152751135'],
    [' 988 ', '988'],
  ])('%p se limpia a %p', (entrada, limpio) => {
    expect(prepararLlamada(entrada, 'android')).toEqual({ tipo: 'marcador', url: `tel:${limpio}`, numero: limpio });
  });

  test.each([['abc'], ['988a'], ['1-800-SUICIDE'], [''], ['+'], ['56+2'], ['tel:988'], ['988.123']])(
    '%p (inválido) → manual numero-invalido, en las dos plataformas',
    (m) => {
      for (const p of ['ios', 'android']) {
        expect(prepararLlamada(m, p)).toEqual({ tipo: 'manual', numero: m, motivo: 'numero-invalido' });
      }
    },
  );

  test("'*4141' en iOS → manual ios-codigo-servicio (Apple no marca * ni # por tel:)", () => {
    expect(prepararLlamada('*4141', 'ios')).toEqual({ tipo: 'manual', numero: '*4141', motivo: 'ios-codigo-servicio' });
    expect(prepararLlamada('*123#', 'ios')).toMatchObject({ tipo: 'manual', motivo: 'ios-codigo-servicio' });
    expect(prepararLlamada('123#', 'ios')).toMatchObject({ tipo: 'manual', motivo: 'ios-codigo-servicio' });
  });

  test("'*4141' en Android → marcador tel:*4141", () => {
    expect(prepararLlamada('*4141', 'android')).toEqual({ tipo: 'marcador', url: 'tel:*4141', numero: '*4141' });
    expect(prepararLlamada('*123#', 'android')).toEqual({ tipo: 'marcador', url: 'tel:*123%23', numero: '*123#' });
  });

  test('número sin * ni # en iOS → marcador', () => {
    expect(prepararLlamada('988', 'ios')).toEqual({ tipo: 'marcador', url: 'tel:988', numero: '988' });
    expect(prepararLlamada('+34 024', 'ios')).toEqual({ tipo: 'marcador', url: 'tel:+34024', numero: '+34024' });
  });

  test('sin plataforma usa Platform.OS', () => {
    const r = prepararLlamada('*4141');
    expect(r.tipo).toBe(Platform.OS === 'ios' ? 'manual' : 'marcador');
  });
});

describe('abrirMarcador', () => {
  let openURL: jest.SpyInstance;
  beforeEach(() => {
    // jest-expo ya trae Linking.openURL como jest.fn: spyOn devuelve ese mismo mock, así que se
    // limpia su historial en cada prueba.
    openURL = jest.spyOn(Linking, 'openURL');
    openURL.mockReset();
    openURL.mockResolvedValue(true);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('abre Linking.openURL una sola vez con la URL tel: esperada', async () => {
    const r = await abrirMarcador('600 360 7777');
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('tel:6003607777');
    expect(r).toEqual({ tipo: 'marcador', url: 'tel:6003607777', numero: '6003607777' });
  });

  test('en Android, *4141 abre tel:*4141', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const r = await abrirMarcador('*4141');
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('tel:*4141');
    expect(r.tipo).toBe('marcador');
  });

  test('en iOS, *4141 es manual y no llama a openURL', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const r = await abrirMarcador('*4141');
    expect(openURL).not.toHaveBeenCalled();
    expect(r).toEqual({ tipo: 'manual', numero: '*4141', motivo: 'ios-codigo-servicio' });
  });

  test('número inválido: manual y no llama a openURL', async () => {
    const r = await abrirMarcador('llamar');
    expect(openURL).not.toHaveBeenCalled();
    expect(r).toMatchObject({ tipo: 'manual', motivo: 'numero-invalido' });
  });

  test('si openURL rechaza (sin app de teléfono) → manual sin-marcador con el número limpio', async () => {
    openURL.mockRejectedValueOnce(new Error('No app'));
    const r = await abrirMarcador('988');
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ tipo: 'manual', numero: '988', motivo: 'sin-marcador' });
  });

  test('nunca usa otra API de llamada directa (solo Linking.openURL con tel:)', () => {
    const fuente = fs.readFileSync(path.resolve(__dirname, '../llamar.ts'), 'utf8');
    const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(codigo).not.toMatch(/telprompt|ACTION_CALL|intent-launcher|sendIntent|canOpenURL|communications/i);
    expect(codigo.match(/Linking\.\w+/g)).toEqual(['Linking.openURL']);
    expect(codigo).not.toMatch(/fetch\(|XMLHttpRequest/);
  });
});

describe('cada línea del contenido real', () => {
  test('hay líneas que probar', () => {
    expect(lineas.length).toBeGreaterThan(0);
  });

  test.each(lineas.map((l) => [`${l.pais} ${l.marcar}`, l] as const))(
    '%s: en Android abre el marcador con exactamente `marcar`',
    (_n, l) => {
      const r = prepararLlamada(l.marcar, 'android');
      expect(r.tipo).toBe('marcador');
      if (r.tipo !== 'marcador') return;
      expect(r.url.startsWith('tel:')).toBe(true);
      expect(decodeURIComponent(r.url.slice(4))).toBe(l.marcar);
      expect(r.numero).toBe(l.marcar);
    },
  );

  test.each(lineas.map((l) => [`${l.pais} ${l.marcar}`, l] as const))(
    '%s: en iOS abre el marcador o (si lleva * o #) pide marcar a mano; nunca numero-invalido',
    (_n, l) => {
      const r = prepararLlamada(l.marcar, 'ios');
      if (/[*#]/.test(l.marcar)) expect(r).toMatchObject({ tipo: 'manual', motivo: 'ios-codigo-servicio' });
      else expect(r.tipo).toBe('marcador');
    },
  );

  test.each(lineas.map((l) => [`${l.pais} ${l.marcar}`, l] as const))(
    '%s: los dígitos de `marcar` coinciden con el `numero` que se muestra',
    (_n, l) => {
      const sinFormato = (s: string) => s.replace(/[^0-9*#+]/g, '');
      expect(sinFormato(l.numero)).toContain(sinFormato(l.marcar));
    },
  );
});
