/// <reference types="jest" />
/*
 * Colores de "Borrar mis datos" (Configuración → Privacidad): AA en las dos paletas y las tres horas,
 * sobre el cielo, el vidrio y la hoja modal.
 */
import { aplanar, contraste } from '../color';
import { PALETAS_IDS } from '../paletas';
import { CONTRASTE_AA, resolverTema } from '../resolver';

const HORAS = ['day', 'dusk', 'night'] as const;

describe.each(PALETAS_IDS)('peligro · %s', (paletaId) => {
  it.each(HORAS)('cumple AA en %s', (hora) => {
    const tema = resolverTema(paletaId, hora);
    const { cielo, colores, superficies } = tema;
    const fondos = [cielo.fondo, cielo.luz, cielo.bruma];
    for (const f of fondos) {
      expect(contraste(colores.peligro, f)).toBeGreaterThanOrEqual(CONTRASTE_AA);
      expect(contraste(colores.peligro, aplanar(superficies.vidrio, f))).toBeGreaterThanOrEqual(CONTRASTE_AA);
    }
    expect(contraste(colores.peligro, superficies.hoja)).toBeGreaterThanOrEqual(CONTRASTE_AA);
    expect(contraste(colores.sobrePeligro, colores.peligroFondo)).toBeGreaterThanOrEqual(CONTRASTE_AA);
    // Texto normal sobre la hoja modal.
    expect(contraste(colores.texto, superficies.hoja)).toBeGreaterThanOrEqual(CONTRASTE_AA);
  });
});
