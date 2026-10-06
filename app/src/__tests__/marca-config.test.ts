/// <reference types="jest" />
/*
 * Hito 11 · Marca: app.json apunta a íconos y pantalla de carga que existen, con las medidas que piden
 * las tiendas y Expo, y con los colores de la marca (no los de la plantilla de Expo).
 * Los PNG los genera `npm run marca` en la raíz (scripts/generar-marca.mjs).
 */
import { rosaMistica } from '@/theme/paletas';
import { constantesHora } from '@/theme/resolver';

declare const __dirname: string;
const { readFileSync, existsSync } = require('fs') as {
  readFileSync(f: string): { subarray(a: number, b: number): { toString(e: 'latin1'): string }; readUInt32BE(o: number): number; [i: number]: number };
  readFileSync(f: string, enc: 'utf8'): string;
  existsSync(f: string): boolean;
};
const { join } = require('path') as { join(...p: string[]): string };

const raizApp = join(__dirname, '..', '..');
const textoConfig = readFileSync(join(raizApp, 'app.json'), 'utf8');
const expo = JSON.parse(textoConfig).expo;

/** Cabecera IHDR de un PNG: ancho, alto y tipo de color (2 = RGB sin alfa, 6 = RGBA). */
function cabeceraPng(ruta: string) {
  const buf = readFileSync(join(raizApp, ruta));
  expect(buf.subarray(1, 4).toString('latin1')).toBe('PNG');
  expect(buf.subarray(12, 16).toString('latin1')).toBe('IHDR');
  return { ancho: buf.readUInt32BE(16), alto: buf.readUInt32BE(20), tipoColor: buf[25] };
}

const splash = expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen')?.[1];

describe('app.json · íconos y pantalla de carga', () => {
  it('ícono de iOS: 1024×1024 y sin canal alfa', () => {
    expect(expo.icon).toBe('./assets/images/icon.png');
    expect(cabeceraPng(expo.icon)).toEqual({ ancho: 1024, alto: 1024, tipoColor: 2 });
  });

  it('sin ícono de Icon Composer (.icon) ni rutas a archivos que no existen', () => {
    expect(expo.ios?.icon).toBeUndefined();
    const rutas = [
      expo.icon,
      expo.web.favicon,
      ...Object.values(expo.android.adaptiveIcon).filter((v) => typeof v === 'string' && v.startsWith('./')),
      splash.image,
      splash.dark?.image,
    ].filter(Boolean) as string[];
    for (const r of rutas) expect(existsSync(join(raizApp, r))).toBe(true);
  });

  it('Android adaptativo: tres capas de 432×432 y color de fondo de la marca', () => {
    const a = expo.android.adaptiveIcon;
    expect(cabeceraPng(a.backgroundImage)).toMatchObject({ ancho: 432, alto: 432 });
    expect(cabeceraPng(a.foregroundImage)).toEqual({ ancho: 432, alto: 432, tipoColor: 6 });
    expect(cabeceraPng(a.monochromeImage)).toEqual({ ancho: 432, alto: 432, tipoColor: 6 });
    expect(a.backgroundColor).toBe(rosaMistica.primaryDeep);
  });

  it('favicon de 48×48', () => {
    expect(cabeceraPng(expo.web.favicon)).toMatchObject({ ancho: 48, alto: 48 });
  });

  it('pantalla de carga: símbolo con transparencia y colores del sistema de diseño', () => {
    expect(cabeceraPng(splash.image)).toMatchObject({ tipoColor: 6 });
    const { ancho, alto } = cabeceraPng(splash.image);
    expect(ancho).toBe(alto);
    expect(splash.backgroundColor).toBe(rosaMistica.primaryDeep);
    expect(splash.dark.backgroundColor).toBe(constantesHora.fondoCompletas);
    // Android 12+ enmascara el ícono de carga en un círculo de 192 dp: el símbolo no puede pasarse.
    expect(splash.imageWidth).toBeLessThanOrEqual(192);
    expect(expo.backgroundColor).toBe(rosaMistica.primaryDeep);
  });

  it('identificadores de Soul Shelter (decisiones 2026-10-06), sin restos de "app" ni de Obra Buena', () => {
    expect(expo.name).toBe('Soul Shelter');
    expect(expo.slug).toBe('soul-shelter');
    expect(expo.scheme).toBe('soulshelter');
    expect(expo.android.package).toBe('app.soulshelter');
    expect(expo.ios.bundleIdentifier).toBe('app.soulshelter');
    expect(textoConfig).not.toMatch(/obra[ -]?buena/i);
    const paquete = JSON.parse(readFileSync(join(raizApp, 'package.json'), 'utf8'));
    expect(paquete.name).toBe('soul-shelter');
  });

  it('no quedan colores de la plantilla de Expo', () => {
    expect(textoConfig).not.toMatch(/#E6F4FE/i);
    expect(textoConfig).not.toMatch(/#208AEF/i);
  });
});
