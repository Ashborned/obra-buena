/// <reference types="jest" />
/*
 * Pascua y Corpus Christi 2026–2030, y la novena `cc` (fiesta móvil) según el país.
 * Tabla de Pascua: fechas gregorianas publicadas (p. ej. USCCB / tablas de Computus).
 */
import datos from '../../../../content/contenido.json';
import type { Contenido, Novena } from '@/contenido/tipos';

import { corpusChristi, pascua } from '../liturgia';
import { diasEntre, estadoNovena, proximaFiesta } from '../novenas';
import { estadoDeNovena, fiestaDeNovena, trasladaAlDomingo } from '../novenas-contenido';

const contenido = datos as unknown as Contenido;
const traslados = contenido.traslados ?? [];
const cc = contenido.novenas.find((n) => n.id === 'cc') as Novena;

const d = (a: number, m: number, dia: number, h = 0, min = 0) => new Date(a, m - 1, dia, h, min);
const ymd = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

const PASCUA: Record<number, string> = {
  2026: '2026-04-05',
  2027: '2027-03-28',
  2028: '2028-04-16',
  2029: '2029-04-01',
  2030: '2030-04-21',
};
// Pascua + 60 (jueves) y + 63 (domingo), calculadas a mano.
const CORPUS_JUEVES: Record<number, string> = {
  2026: '2026-06-04',
  2027: '2027-05-27',
  2028: '2028-06-15',
  2029: '2029-05-31',
  2030: '2030-06-20',
};
const CORPUS_DOMINGO: Record<number, string> = {
  2026: '2026-06-07',
  2027: '2027-05-30',
  2028: '2028-06-18',
  2029: '2029-06-03',
  2030: '2030-06-23',
};

describe('Pascua 2026–2030 (tabla publicada)', () => {
  test.each(Object.keys(PASCUA).map(Number))('Pascua %i', (anio) => {
    const p = pascua(anio);
    expect(ymd(p)).toBe(PASCUA[anio]);
    expect(p.getDay()).toBe(0);
    expect(p.getHours()).toBe(0);
  });
});

describe('Corpus Christi', () => {
  test.each(Object.keys(PASCUA).map(Number))('%i: jueves = Pascua + 60, domingo = Pascua + 63', (anio) => {
    const j = corpusChristi(anio);
    const dom = corpusChristi(anio, true);
    expect(ymd(j)).toBe(CORPUS_JUEVES[anio]);
    expect(ymd(dom)).toBe(CORPUS_DOMINGO[anio]);
    expect(j.getDay()).toBe(4);
    expect(dom.getDay()).toBe(0);
    expect(diasEntre(pascua(anio), j)).toBe(60);
    expect(diasEntre(pascua(anio), dom)).toBe(63);
    expect(ymd(corpusChristi(anio, false))).toBe(CORPUS_JUEVES[anio]);
  });

  test('siempre jueves / domingo de 1990 a 2100', () => {
    for (let a = 1990; a <= 2100; a++) {
      expect(corpusChristi(a).getDay()).toBe(4);
      expect(corpusChristi(a, true).getDay()).toBe(0);
      expect(pascua(a).getDay()).toBe(0);
    }
  });
});

describe('contenido: novena cc', () => {
  test('cc es móvil, sin fixed, y traslados incluye CL para corpus_christi', () => {
    expect(cc).toBeDefined();
    expect('fixed' in cc).toBe(false);
    expect((cc as { movil?: string }).movil).toBe('corpus_christi');
    const t = traslados.find((x) => x.fiesta === 'corpus_christi' && x.a === 'domingo');
    expect(t?.paises).toContain('CL');
  });

  test('trasladaAlDomingo', () => {
    expect(trasladaAlDomingo('corpus_christi', { pais: 'CL', traslados })).toBe(true);
    expect(trasladaAlDomingo('corpus_christi', { pais: 'cl', traslados })).toBe(false);
    expect(trasladaAlDomingo('corpus_christi', { pais: 'CL' })).toBe(false);
    expect(trasladaAlDomingo('corpus_christi', { pais: 'CL', traslados: [] })).toBe(false);
    expect(trasladaAlDomingo('corpus_christi', { pais: 'US', traslados })).toBe(false);
    expect(trasladaAlDomingo('corpus_christi', { pais: null, traslados })).toBe(false);
    expect(trasladaAlDomingo('corpus_christi')).toBe(false);
  });

  test.each([2026, 2027, 2028, 2029, 2030])('%i: CL domingo; US, ES y sin país jueves', (anio) => {
    const enero = d(anio, 1, 1);
    const cl = proximaFiesta(fiestaDeNovena(cc, { pais: 'CL', traslados }), enero);
    expect(ymd(cl)).toBe(CORPUS_DOMINGO[anio]);
    for (const pais of ['US', 'ES', null]) {
      const f = proximaFiesta(fiestaDeNovena(cc, { pais, traslados }), enero);
      expect(ymd(f)).toBe(CORPUS_JUEVES[anio]);
    }
    expect(ymd(proximaFiesta(fiestaDeNovena(cc), enero))).toBe(CORPUS_JUEVES[anio]);
  });

  test('novena de Corpus 2026 (jueves): 26 may – 3 jun; el día de Corpus "es su fiesta"', () => {
    const f = fiestaDeNovena(cc, { pais: 'US', traslados });
    const e = estadoNovena(f, d(2026, 5, 26, 10));
    expect(ymd(e.inicio)).toBe('2026-05-26');
    expect(ymd(e.fin)).toBe('2026-06-03');
    expect(e.dia).toBe(1);
    const fiesta = estadoNovena(f, d(2026, 6, 4, 22));
    expect(fiesta.esFiesta).toBe(true);
    expect(fiesta.dia).toBeNull();
    expect(ymd(fiesta.fiesta)).toBe('2026-06-04');
    expect(estadoDeNovena(cc, d(2026, 6, 4), { pais: 'US', traslados }).grupo).toBe('enCurso');
  });

  test('CL: el jueves de Corpus es día 7 de la novena; el domingo es la fiesta', () => {
    const ctx = { pais: 'CL', traslados };
    expect(estadoDeNovena(cc, d(2026, 6, 4), ctx).estado.dia).toBe(7);
    const e = estadoDeNovena(cc, d(2026, 6, 7), ctx).estado;
    expect(e.esFiesta).toBe(true);
    expect(ymd(e.inicio)).toBe('2026-05-29');
  });

  test('después de Corpus, la próxima es la del año siguiente (recalculada, no la misma fecha)', () => {
    const f = fiestaDeNovena(cc, { pais: 'ES', traslados });
    const e = estadoNovena(f, d(2026, 6, 5));
    expect(ymd(e.fiesta)).toBe('2027-05-27');
    expect(ymd(e.inicio)).toBe('2027-05-18');
    expect(e.dia).toBeNull();
    expect(e.esFiesta).toBe(false);
    expect(e.faltan).toBe(diasEntre(d(2026, 6, 5), d(2027, 5, 18)));
    // CL: después del domingo 7 jun 2026 → domingo 30 may 2027.
    const cl = estadoNovena(fiestaDeNovena(cc, { pais: 'CL', traslados }), d(2026, 6, 8));
    expect(ymd(cl.fiesta)).toBe('2027-05-30');
  });

  test('la fiesta calculada ignora la hora que pudiera traer calcular()', () => {
    const e = estadoNovena({ calcular: (a) => new Date(a, 5, 4, 15, 30) }, d(2026, 6, 4, 9));
    expect(e.esFiesta).toBe(true);
    expect(e.fiesta.getHours()).toBe(0);
  });
});
