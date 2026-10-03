/// <reference types="jest" />
/*
 * Textos de estado de Novenas: deben dar exactamente lo mismo que `T.es` / `T.en` de
 * prototype/obra-buena.html (`dayOf`, `inDays`), más el estado nuevo "Hoy es su fiesta".
 */
import i18n from '..';

jest.mock('../../lib/preferencias', () => ({
  leerIdioma: () => null,
  guardarIdioma: () => {},
}));

// Copia literal de la maqueta.
const T = {
  es: {
    dayOf: (d: number) => 'Día ' + d + ' de 9',
    inDays: (n: number) =>
      n === 0 ? 'Empieza hoy' : n === 1 ? 'Empieza mañana' : 'En ' + n + ' días',
    fiesta: 'Hoy es su fiesta',
  },
  en: {
    dayOf: (d: number) => 'Day ' + d + ' of 9',
    inDays: (n: number) =>
      n === 0 ? 'Starts today' : n === 1 ? 'Starts tomorrow' : 'In ' + n + ' days',
    fiesta: 'Today is the feast',
  },
} as const;

describe.each(['es', 'en'] as const)('novenas en %s', (idioma) => {
  const t = i18n.getFixedT(idioma);

  it.each([0, 1, 2, 5])('n = %i', (n) => {
    expect(t('novenas.diaDe', { n })).toBe(T[idioma].dayOf(n));
    expect(t('novenas.empiezaEn', { count: n })).toBe(T[idioma].inDays(n));
  });

  it('día de la fiesta', () => {
    expect(t('novenas.esSuFiesta')).toBe(T[idioma].fiesta);
  });
});
