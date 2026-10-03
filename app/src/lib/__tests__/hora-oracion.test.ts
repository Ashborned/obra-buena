/// <reference types="jest" />
import { horaEfectiva, horaSegunReloj, type HoraOracion } from '../hora-oracion';

/*
 * Referencia: copia literal de prototype/obra-buena.html (hourNow / curHour).
 * `state` se simula; `new Date()` se controla con temporizadores falsos de Jest.
 */
const state: { hour: string } = { hour: 'auto' };
/* eslint-disable */
// prettier-ignore
function hourNow(){var h=new Date().getHours();return h>=5&&h<12?'day':h>=12&&h<20?'dusk':'night'}
// prettier-ignore
function curHour(){return state.hour==='auto'?hourNow():state.hour}
/* eslint-enable */

const en = (h: number, m: number) => new Date(2026, 9, 3, h, m, 0);

describe('horaSegunReloj: límites exactos', () => {
  const casos: [number, number, HoraOracion][] = [
    [0, 0, 'night'],
    [4, 59, 'night'],
    [5, 0, 'day'],
    [11, 59, 'day'],
    [12, 0, 'dusk'],
    [19, 59, 'dusk'],
    [20, 0, 'night'],
    [23, 59, 'night'],
  ];

  test.each(casos)('%d:%d -> %s', (h, m, esperado) => {
    expect(horaSegunReloj(en(h, m))).toBe(esperado);
  });

  test('las 1440 horas-minuto del día coinciden con la maqueta', () => {
    jest.useFakeTimers();
    try {
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m++) {
          const d = en(h, m);
          jest.setSystemTime(d);
          expect(horaSegunReloj(d)).toBe(hourNow());
        }
      }
    } finally {
      jest.useRealTimers();
    }
  });

  test('sin argumento usa la hora actual', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(en(12, 30));
      expect(horaSegunReloj()).toBe('dusk');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('horaEfectiva', () => {
  test("'auto' sigue al reloj", () => {
    expect(horaEfectiva('auto', en(6, 0))).toBe('day');
    expect(horaEfectiva('auto', en(15, 0))).toBe('dusk');
    expect(horaEfectiva('auto', en(22, 0))).toBe('night');
  });

  const fijas: HoraOracion[] = ['day', 'dusk', 'night'];
  test.each(fijas)("la hora fija '%s' gana sobre el reloj a cualquier hora", (fija) => {
    for (let h = 0; h < 24; h++) {
      expect(horaEfectiva(fija, en(h, 0))).toBe(fija);
    }
  });

  test('coincide con curHour() de la maqueta', () => {
    jest.useFakeTimers();
    try {
      for (const pref of ['auto', 'day', 'dusk', 'night'] as const) {
        state.hour = pref;
        for (let h = 0; h < 24; h++) {
          const d = en(h, 30);
          jest.setSystemTime(d);
          expect(horaEfectiva(pref, d)).toBe(curHour());
        }
      }
    } finally {
      state.hour = 'auto';
      jest.useRealTimers();
    }
  });
});
