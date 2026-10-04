/// <reference types="jest" />
/*
 * Conversión OKLCH → hex y contraste AA del texto sobre los tonos de Emociones
 * (docs/sistema-diseno.md → Emociones), en las dos paletas y las tres horas.
 */
import { contraste, hexARgb, oklchAHex, oklchEnGama } from '../color';
import { MATICES_EMOCION, fondosDeTono, tonoEmocion, type IdTonoEmocion } from '../emociones';
import { paletas, type PaletaId } from '../paletas';

const distancia = (a: string, b: string) => {
  const x = hexARgb(a);
  const y = hexARgb(b);
  return Math.max(Math.abs(x.r - y.r), Math.abs(x.g - y.g), Math.abs(x.b - y.b));
};

describe('oklchAHex', () => {
  it('convierte valores de referencia de CSS Color 4', () => {
    expect(oklchAHex(1, 0, 0)).toBe('#ffffff');
    expect(oklchAHex(0, 0, 0)).toBe('#000000');
    // Primarios sRGB (oklch publicados por la especificación / oklch.com).
    expect(distancia(oklchAHex(0.62796, 0.25768, 29.2339), '#ff0000')).toBeLessThanOrEqual(1);
    expect(distancia(oklchAHex(0.86644, 0.29483, 142.4953), '#00ff00')).toBeLessThanOrEqual(1);
    expect(distancia(oklchAHex(0.45201, 0.31321, 264.052), '#0000ff')).toBeLessThanOrEqual(1);
    // Gris medio: croma 0 da un gris neutro.
    const gris = hexARgb(oklchAHex(0.6, 0, 123));
    expect(gris.r).toBe(gris.g);
    expect(gris.g).toBe(gris.b);
  });

  it('baja la croma (no recorta canales) cuando el color no cabe en sRGB', () => {
    expect(oklchEnGama(0.15, 0.14, 280)).toBe(false);
    const hex = oklchAHex(0.15, 0.14, 280);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    // Sigue siendo un violeta oscuro: azul > rojo > verde.
    const { r, g, b } = hexARgb(hex);
    expect(b).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(g);
  });

  it('al bajar la croma conserva la luminosidad y el matiz (no se corre a otro color)', () => {
    // oklch(0.955 0.04 250) se sale apenas de sRGB por el canal azul: queda un celeste muy claro.
    expect(oklchEnGama(0.955, 0.04, 250)).toBe(false);
    const { r, g, b } = hexARgb(oklchAHex(0.955, 0.04, 250));
    expect(b).toBeGreaterThanOrEqual(g);
    expect(g).toBeGreaterThan(r);
    expect(Math.min(r, g, b)).toBeGreaterThan(220);
  });
});

describe.each(Object.keys(paletas) as PaletaId[])('tonos de Emociones · %s', (paletaId) => {
  const ink = paletas[paletaId].ink;
  describe.each(['day', 'dusk', 'night'] as const)('%s', (hora) => {
    it.each(Object.keys(MATICES_EMOCION) as IdTonoEmocion[])('%s: texto y texto suave AA', (id) => {
      const tono = tonoEmocion(id, hora, ink);
      for (const fondo of fondosDeTono(tono)) {
        expect(contraste(tono.texto, fondo)).toBeGreaterThanOrEqual(4.5);
        expect(contraste(tono.textoSuave, fondo)).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
});
