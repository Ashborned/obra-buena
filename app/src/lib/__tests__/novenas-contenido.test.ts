/// <reference types="jest" />
/*
 * Novenas del contenido: fecha según el país, grupos de la lista, año de la fiesta
 * y oración del día. Se corre también en 6 zonas (npm run test:tz).
 */
import datos from '../../../../content/contenido.json';
import type { Contenido, Novena } from '@/contenido/tipos';

import { estadoNovena } from '../novenas';
import {
  agruparNovenas,
  anioDeFiesta,
  DIAS_PROXIMA,
  estadoDeNovena,
  fiestaDeNovena,
  grupoDe,
  oracionDelDia,
} from '../novenas-contenido';

const contenido = datos as unknown as Contenido;
const traslados = contenido.traslados ?? [];

const d = (a: number, m: number, dia: number, h = 0, min = 0) => new Date(a, m - 1, dia, h, min);
const ymd = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

const base = { es: 'N', en: 'N', ini: 'N', revision: 'aprobado' as const };
const anual = (id: string, m: number, dd: number): Novena => ({ id, ...base, m, d: dd }) as Novena;
const unica = (id: string, a: number, m: number, dd: number): Novena => ({ id, ...base, fixed: [a, m, dd] }) as Novena;
const ids = (xs: { novena: Novena }[]) => xs.map((x) => x.novena.id);

describe('los 9 días antes de la fiesta (vía fiestaDeNovena)', () => {
  test('inicio = fiesta − 9, fin = víspera, días 1–9', () => {
    const n = anual('ter', 10, 1);
    for (let i = 0; i < 9; i++) {
      const e = estadoDeNovena(n, d(2026, 9, 22 + i, 12)).estado;
      expect(ymd(e.inicio)).toBe('2026-09-22');
      expect(ymd(e.fin)).toBe('2026-09-30');
      expect(e.dia).toBe(i + 1);
    }
    expect(estadoDeNovena(n, d(2026, 9, 21)).estado.dia).toBeNull();
    expect(estadoDeNovena(n, d(2026, 10, 1)).estado.esFiesta).toBe(true);
  });

  test('cambio de año: fiesta 1 ene (novena 23–31 dic) y 5 ene (27 dic – 4 ene)', () => {
    const e1 = estadoDeNovena(anual('a', 1, 1), d(2026, 12, 31)).estado;
    expect([ymd(e1.inicio), ymd(e1.fin), e1.dia, ymd(e1.fiesta)]).toEqual(['2026-12-23', '2026-12-31', 9, '2027-01-01']);
    const e5 = estadoDeNovena(anual('b', 1, 5), d(2027, 1, 2)).estado;
    expect([ymd(e5.inicio), ymd(e5.fin), e5.dia]).toEqual(['2026-12-27', '2027-01-04', 7]);
  });

  test('29 feb: en 2027 (no bisiesto) se celebra el 28 y la novena es 19–27 feb; en 2028, 20–28 feb', () => {
    const n = anual('feb', 2, 29);
    const e = estadoDeNovena(n, d(2027, 2, 19)).estado;
    expect([ymd(e.fiesta), ymd(e.inicio), ymd(e.fin), e.dia]).toEqual(['2027-02-28', '2027-02-19', '2027-02-27', 1]);
    const b = estadoDeNovena(n, d(2028, 2, 28)).estado;
    expect([ymd(b.fiesta), ymd(b.inicio), b.dia]).toEqual(['2028-02-29', '2028-02-20', 9]);
  });
});

describe('grupoDe y agruparNovenas', () => {
  const hoy = d(2026, 1, 1);

  test('borde de "Próximas": faltan 45 → próximas; 46 → más adelante', () => {
    expect(DIAS_PROXIMA).toBe(45);
    const n45 = estadoDeNovena(anual('a45', 2, 24), hoy); // inicio 15 feb
    const n46 = estadoDeNovena(anual('a46', 2, 25), hoy); // inicio 16 feb
    expect(n45.estado.faltan).toBe(45);
    expect(n45.grupo).toBe('proximas');
    expect(n46.estado.faltan).toBe(46);
    expect(n46.grupo).toBe('masAdelante');
  });

  test('faltan 1 → próximas; días 1–9 y el día de la fiesta → en curso; día siguiente → más adelante', () => {
    const n = anual('x', 1, 20); // novena 11–19 ene
    expect(estadoDeNovena(n, d(2026, 1, 10)).grupo).toBe('proximas');
    for (let dd = 11; dd <= 20; dd++) expect(estadoDeNovena(n, d(2026, 1, dd)).grupo).toBe('enCurso');
    expect(estadoDeNovena(n, d(2026, 1, 21)).grupo).toBe('masAdelante');
  });

  test('una fecha única ya pasada no aparece; la futura sí; la del día es "en curso"', () => {
    expect(estadoDeNovena(unica('p', 2025, 5, 27), hoy).grupo).toBeNull();
    expect(estadoDeNovena(unica('f', 2026, 1, 5), hoy).grupo).toBe('enCurso');
    expect(estadoDeNovena(unica('h', 2026, 1, 1), hoy).estado.esFiesta).toBe(true);
    const g = agruparNovenas([unica('p', 2025, 5, 27), unica('f2', 2026, 6, 1)], hoy);
    expect([...ids(g.enCurso), ...ids(g.proximas), ...ids(g.masAdelante)]).toEqual(['f2']);
  });

  test('grupoDe con estados construidos', () => {
    expect(grupoDe(estadoNovena({ mes: 1, dia: 1 }, d(2026, 1, 1)))).toBe('enCurso');
    expect(grupoDe(estadoNovena({ fecha: { anio: 2025, mes: 12, dia: 1 } }, hoy))).toBeNull();
  });

  test('orden por fecha de inicio dentro de cada grupo (no por orden de entrada)', () => {
    const g = agruparNovenas(
      [anual('c', 1, 9), anual('a', 1, 3), anual('b', 1, 6), anual('z', 12, 1), anual('y', 6, 1), anual('p2', 2, 10), anual('p1', 1, 25)],
      hoy,
    );
    expect(ids(g.enCurso)).toEqual(['a', 'b', 'c']);
    expect(ids(g.proximas)).toEqual(['p1', 'p2']);
    expect(ids(g.masAdelante)).toEqual(['y', 'z']);
  });

  test('contenido real, 29 sep 2026: Teresita y Bruno en curso; nada próximo; resto más adelante ordenado', () => {
    for (const pais of ['CL', 'US', null]) {
      const g = agruparNovenas(contenido.novenas, d(2026, 9, 29, 9), { pais, traslados });
      expect(ids(g.enCurso)).toEqual(['ter', 'bru']);
      expect(g.enCurso.map((x) => x.estado.dia)).toEqual([8, 3]);
      expect(ids(g.proximas)).toEqual([]);
      expect(ids(g.masAdelante)).toEqual(['cc', 'dom', 'mon', 'mat']);
      const total = g.enCurso.length + g.proximas.length + g.masAdelante.length;
      expect(total).toBe(contenido.novenas.length);
    }
  });

  test('contenido real, 15 jul 2026: Domingo y Mónica próximas; Mateo a 59 días, más adelante', () => {
    const g = agruparNovenas(contenido.novenas, d(2026, 7, 15), { pais: 'ES', traslados });
    expect(ids(g.enCurso)).toEqual([]);
    expect(ids(g.proximas)).toEqual(['dom', 'mon']);
    expect(g.proximas.map((x) => x.estado.faltan)).toEqual([15, 34]);
    expect(ids(g.masAdelante)).toEqual(['mat', 'ter', 'bru', 'cc']);
  });

  test('contenido real, 7 jun 2026: Corpus es fiesta en CL (en curso) y ya pasó en US (más adelante)', () => {
    const cl = agruparNovenas(contenido.novenas, d(2026, 6, 7), { pais: 'CL', traslados });
    expect(ids(cl.enCurso)).toEqual(['cc']);
    expect(cl.enCurso[0].estado.esFiesta).toBe(true);
    const us = agruparNovenas(contenido.novenas, d(2026, 6, 7), { pais: 'US', traslados });
    expect(ids(us.enCurso)).toEqual([]);
    expect(ymd(us.masAdelante.find((x) => x.novena.id === 'cc')!.estado.fiesta)).toBe('2027-05-27');
  });
});

describe('anioDeFiesta', () => {
  test('año de la fiesta, no de hoy: novena de enero que empieza en diciembre', () => {
    const e = estadoDeNovena(anual('epi', 1, 5), d(2026, 12, 28)).estado;
    expect(e.dia).toBe(2);
    expect(anioDeFiesta(e)).toBe(2027);
  });
  test('la misma novena en 2026 y 2027 da años distintos', () => {
    const n = anual('ter', 10, 1);
    expect(anioDeFiesta(estadoDeNovena(n, d(2026, 9, 25)).estado)).toBe(2026);
    expect(anioDeFiesta(estadoDeNovena(n, d(2026, 10, 1)).estado)).toBe(2026);
    expect(anioDeFiesta(estadoDeNovena(n, d(2026, 10, 2)).estado)).toBe(2027);
  });
  test('fiesta móvil: año del Corpus que corresponde', () => {
    const cc = contenido.novenas.find((n) => n.id === 'cc')!;
    expect(anioDeFiesta(estadoNovena(fiestaDeNovena(cc, { pais: 'CL', traslados }), d(2026, 6, 7)))).toBe(2026);
    expect(anioDeFiesta(estadoNovena(fiestaDeNovena(cc, { pais: 'CL', traslados }), d(2026, 6, 8)))).toBe(2027);
  });
});

describe('oracionDelDia', () => {
  const dias = Array.from({ length: 9 }, (_, i) => ({ es: `Día ${i + 1}`, en: `Day ${i + 1}` }));
  const conDias = { ...anual('c', 1, 1), dias } as Novena;
  const sinDias = anual('s', 1, 1);
  const incompleta = { ...anual('i', 1, 1), dias: dias.slice(0, 5) } as Novena;

  test('con dias: la oración de ese día', () => {
    for (let i = 1; i <= 9; i++) {
      expect(oracionDelDia(conDias, i, 'produccion')).toEqual({ tipo: 'oracion', oracion: dias[i - 1] });
    }
  });
  test('sin dias: marcador en desarrollo, próximamente en producción', () => {
    expect(oracionDelDia(sinDias, 3, 'desarrollo')).toEqual({ tipo: 'marcador' });
    expect(oracionDelDia(sinDias, 3, 'produccion')).toEqual({ tipo: 'proximamente' });
  });
  test('dias incompleto: el día que falta da marcador / próximamente', () => {
    expect(oracionDelDia(incompleta, 5, 'produccion').tipo).toBe('oracion');
    expect(oracionDelDia(incompleta, 6, 'desarrollo')).toEqual({ tipo: 'marcador' });
    expect(oracionDelDia(incompleta, 9, 'produccion')).toEqual({ tipo: 'proximamente' });
  });
  test('día fuera de rango no devuelve otra oración', () => {
    expect(oracionDelDia(conDias, 0, 'produccion').tipo).toBe('proximamente');
    expect(oracionDelDia(conDias, 10, 'produccion').tipo).toBe('proximamente');
  });
  test('contenido real: ninguna novena tiene dias todavía → próximamente en producción', () => {
    for (const n of contenido.novenas) {
      if (!n.dias) expect(oracionDelDia(n, 1, 'produccion')).toEqual({ tipo: 'proximamente' });
      else expect(n.dias).toHaveLength(9);
    }
  });
});
