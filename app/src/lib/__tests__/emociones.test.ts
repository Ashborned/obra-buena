/// <reference types="jest" />
/*
 * Rotación diaria de Emociones y reglas de la tarjeta de ayuda (CLAUDE.md, principios 1 y 6;
 * docs/decisiones.md, 2026-10-03: rotación por días civiles desde una fecha fija).
 * Corre también en 6 zonas horarias con `npm run test:tz`.
 */
import datos from '../../../../content/contenido.json';
import { filtrarPorRevision } from '@/contenido/filtro';
import type { Contenido, Emocion, EntradaEmocion, IdEmocion } from '@/contenido/tipos';

import { EMOCIONES_CON_AYUDA, entradaDelDia, indiceDelDia, muestraAyuda, posicionAyuda } from '../emociones';

const real = datos as unknown as Contenido;
const dev = filtrarPorRevision(real, 'desarrollo');

/** Emoción de prueba con `n` entradas distinguibles por `ref[0]` ("E0", "E1", ...). */
function emocion(n: number, id: IdEmocion = 'happy', care?: number): Emocion {
  const items: EntradaEmocion[] = Array.from({ length: n }, (_, i) => ({
    ref: [`E${i}`, `E${i}`],
    v: ['v', 'v'],
    p: ['p', 'p'],
    c: { ini: 'X', es: [`Santo ${i}`, ''], en: [`Saint ${i}`, ''] },
    revision: 'aprobado',
  }));
  return { id, es: id, en: id, ...(care ? { care } : {}), items };
}

const idx = (e: Emocion, f: Date, d = 0) => entradaDelDia(e, f, d)!.indice;

/* ------------------------------------------------------------------------------------------------
 * Referencia: copia literal de `dayIdx()` y `pick()` de prototype/obra-buena.html (líneas 453–454).
 * `new Date()` se controla con temporizadores falsos.
 * ---------------------------------------------------------------------------------------------- */
/* eslint-disable */
// prettier-ignore
var state: any = { alt: {} };
// prettier-ignore
function dayIdx(){var n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate());return Math.round((t as any-(new Date(n.getFullYear(),0,1) as any))/86400000)}
// prettier-ignore
function pick(e: any){var n=e.items.length,o=(state.alt&&state.alt[e.id])||0;return e.items[(dayIdx()+o)%n]}
/* eslint-enable */

function enMaqueta<T>(fecha: Date, f: () => T): T {
  jest.useFakeTimers({ now: fecha });
  try {
    return f();
  } finally {
    jest.useRealTimers();
  }
}

describe('rotación: la misma entrada todo el día', () => {
  const e = emocion(3);
  test.each([
    [new Date(2026, 9, 3)],
    [new Date(2027, 0, 1)],
    [new Date(2025, 5, 15)],
    [new Date(2028, 1, 29)],
  ])('%p: 00:00, 12:00 y 23:59 dan la misma', (dia) => {
    const y = dia.getFullYear();
    const m = dia.getMonth();
    const d = dia.getDate();
    const a = idx(e, new Date(y, m, d, 0, 0));
    expect(idx(e, new Date(y, m, d, 12, 0))).toBe(a);
    expect(idx(e, new Date(y, m, d, 23, 59, 59, 999))).toBe(a);
  });
});

describe('rotación: cambio de día', () => {
  test.each([3, 5, 7])('23:59 → 00:00 del día siguiente avanza exactamente 1 (total %i)', (total) => {
    const e = emocion(total);
    for (let d = 0; d < 40; d++) {
      const antes = new Date(2026, 9, 3 + d, 23, 59);
      const despues = new Date(2026, 9, 4 + d, 0, 0);
      expect(idx(e, despues)).toBe((idx(e, antes) + 1) % total);
    }
  });

  test.each([1, 2, 3, 4, 12])('tras %i días vuelve a la primera y recorre todas sin saltarse ninguna', (total) => {
    const e = emocion(total);
    const inicio = new Date(2026, 9, 3, 9, 0);
    const vistos: number[] = [];
    for (let d = 0; d < total; d++) vistos.push(idx(e, new Date(2026, 9, 3 + d, 9, 0)));
    expect([...vistos].sort((a, b) => a - b)).toEqual(Array.from({ length: total }, (_, i) => i));
    expect(idx(e, new Date(2026, 9, 3 + total, 9, 0))).toBe(idx(e, inicio));
  });

  test('indiceDelDia: días civiles consecutivos difieren en 1', () => {
    expect(indiceDelDia(new Date(2026, 0, 1, 15))).toBe(0);
    expect(indiceDelDia(new Date(2026, 0, 2, 0))).toBe(1);
    expect(indiceDelDia(new Date(2025, 11, 31, 23, 59))).toBe(-1);
  });
});

describe('rotación: cambio de año', () => {
  test.each([2025, 2026, 2027, 2028, 2029])('31 dic %i → 1 ene avanza 1 (con 2, 3, 4, 5 y 7 entradas)', (anio) => {
    for (const total of [2, 3, 4, 5, 7]) {
      const e = emocion(total);
      const a = idx(e, new Date(anio, 11, 31, 20));
      const b = idx(e, new Date(anio + 1, 0, 1, 8));
      expect(b).toBe((a + 1) % total);
    }
  });

  test('la maqueta (día del año) repite al cambiar de 2026 a 2027 con 3 entradas; la app no', () => {
    const e = emocion(3);
    const proto = (f: Date) => enMaqueta(f, () => pick(e).ref[0] as string);
    const d30 = proto(new Date(2026, 11, 30, 12));
    const d31 = proto(new Date(2026, 11, 31, 12));
    const e01 = proto(new Date(2027, 0, 1, 12));
    // Maqueta: 30 dic (día 363) → E0, 31 dic (364) → E1, 1 ene (0) → E0 otra vez.
    expect([d30, d31, e01]).toEqual(['E0', 'E1', 'E0']);
    expect(e01).toBe(d30); // repetición: no avanza 1 desde el 31
    // App: tres días seguidos, tres entradas distintas.
    const app = [new Date(2026, 11, 30, 12), new Date(2026, 11, 31, 12), new Date(2027, 0, 1, 12)].map(
      (f) => entradaDelDia(e, f)!.entrada.ref[0],
    );
    expect(new Set(app).size).toBe(3);
  });

  test('la maqueta repite con 2 entradas (2026→2027) y retrocede con 4 tras un bisiesto (2028→2029); la app no', () => {
    const e2 = emocion(2);
    const p2 = (f: Date) => enMaqueta(f, () => pick(e2).ref[0] as string);
    // 31 dic 2026 = día 364 → E0; 1 ene 2027 = día 0 → E0 (repite).
    expect(p2(new Date(2026, 11, 31, 12))).toBe(p2(new Date(2027, 0, 1, 12)));
    expect(idx(e2, new Date(2027, 0, 1, 12))).toBe((idx(e2, new Date(2026, 11, 31, 12)) + 1) % 2);

    const e4 = emocion(4);
    const p4 = (f: Date) => enMaqueta(f, () => pick(e4).ref[0] as string);
    // 31 dic 2028 = día 365 → E1; 1 ene 2029 = día 0 → E0 (retrocede en vez de ir a E2).
    expect([p4(new Date(2028, 11, 31, 12)), p4(new Date(2029, 0, 1, 12))]).toEqual(['E1', 'E0']);
    expect(idx(e4, new Date(2029, 0, 1, 12))).toBe((idx(e4, new Date(2028, 11, 31, 12)) + 1) % 4);
  });
});

describe('rotación: fechas antes del origen (2026-01-01)', () => {
  test.each([new Date(2025, 0, 1), new Date(2025, 11, 31, 23, 59), new Date(2020, 1, 29), new Date(1999, 6, 4)])(
    '%p da 0 ≤ indice < total',
    (f) => {
      for (const total of [1, 2, 3, 7]) {
        const r = entradaDelDia(emocion(total), f)!;
        expect(Number.isInteger(r.indice)).toBe(true);
        expect(r.indice).toBeGreaterThanOrEqual(0);
        expect(r.indice).toBeLessThan(total);
        expect(r.total).toBe(total);
        expect(r.entrada).toBeDefined();
      }
    },
  );

  test('cruzar el origen (31 dic 2025 → 1 ene 2026) también avanza 1', () => {
    const e = emocion(3);
    expect(idx(e, new Date(2026, 0, 1, 0, 0))).toBe((idx(e, new Date(2025, 11, 31, 23, 59)) + 1) % 3);
  });
});

describe('rotación: horario de verano (correr con npm run test:tz)', () => {
  /**
   * Recorre [desde, hasta) cada 15 minutos de tiempo real: dentro de un mismo día civil el índice no
   * cambia, y al cambiar de día civil avanza exactamente 1. Así ningún cambio de hora (en la zona en
   * que corra la prueba) repite ni salta entradas.
   */
  function sinSaltosNiRepeticiones(desde: Date, hasta: Date, total: number) {
    const e = emocion(total);
    let prev = desde;
    let prevIdx = idx(e, prev);
    for (let t = desde.getTime() + 15 * 60_000; t < hasta.getTime(); t += 15 * 60_000) {
      const f = new Date(t);
      const i = idx(e, f);
      const mismoDia =
        f.getFullYear() === prev.getFullYear() && f.getMonth() === prev.getMonth() && f.getDate() === prev.getDate();
      if (mismoDia) expect(i).toBe(prevIdx);
      else expect(i).toBe((prevIdx + 1) % total);
      prev = f;
      prevIdx = i;
    }
  }

  test.each([
    ['America/Santiago: inicio de verano 6 sep 2026', new Date(2026, 8, 4), new Date(2026, 8, 8)],
    ['America/Santiago: fin de verano 5 abr 2026', new Date(2026, 3, 3), new Date(2026, 3, 7)],
    ['Europe/Madrid: fin de verano 25 oct 2026', new Date(2026, 9, 23), new Date(2026, 9, 27)],
    ['Europe/Madrid: inicio de verano 29 mar 2026', new Date(2026, 2, 27), new Date(2026, 2, 31)],
    ['America/New_York: 8 mar y 1 nov 2026', new Date(2026, 2, 6), new Date(2026, 2, 10)],
    ['America/New_York: 1 nov 2026', new Date(2026, 9, 30), new Date(2026, 10, 3)],
    ['Pacific/Auckland: 27 sep 2026', new Date(2026, 8, 25), new Date(2026, 8, 29)],
  ])('%s', (_n, desde, hasta) => {
    sinSaltosNiRepeticiones(desde, hasta, 3);
    sinSaltosNiRepeticiones(desde, hasta, 7);
  });

  test('un año completo, cada 15 minutos: avanza 1 por día civil y nada más', () => {
    sinSaltosNiRepeticiones(new Date(2026, 0, 1), new Date(2027, 0, 3), 5);
  });

  test('America/Santiago 6 sep 2026: las 00:00 no existen (salta a 01:00) y aun así es el día 6', () => {
    const e = emocion(3);
    const sab = idx(e, new Date(2026, 8, 5, 23, 59));
    const dom = idx(e, new Date(2026, 8, 6, 0, 0)); // en Santiago se normaliza a 01:00
    expect(dom).toBe((sab + 1) % 3);
    expect(idx(e, new Date(2026, 8, 6, 23, 59))).toBe(dom);
  });
});

describe('entradaDelDia: casos límite', () => {
  test('emoción sin entradas → null (también con desplazamiento)', () => {
    expect(entradaDelDia(emocion(0), new Date(2026, 9, 3))).toBeNull();
    expect(entradaDelDia(emocion(0), new Date(2026, 9, 3), 5)).toBeNull();
  });

  test('devuelve la entrada de la posición indicada y el total', () => {
    const e = emocion(4);
    const r = entradaDelDia(e, new Date(2026, 9, 3))!;
    expect(r.total).toBe(4);
    expect(r.entrada).toBe(e.items[r.indice]);
  });
});

describe('"Otra oración": desplazamiento', () => {
  const e = emocion(3);
  const hoy = new Date(2026, 9, 3, 10);
  const base = idx(e, hoy);

  test('desplazamiento 1 da la siguiente', () => {
    expect(idx(e, hoy, 1)).toBe((base + 1) % 3);
    expect(entradaDelDia(e, hoy, 1)!.entrada).toBe(e.items[(base + 1) % 3]);
  });

  test.each([3, 6, 300])('desplazamiento %i (múltiplo del total) vuelve a la del día', (d) => {
    expect(idx(e, hoy, d)).toBe(base);
  });

  test.each([4, 5, 1000, 3001])('desplazamiento %i > total da (base + d) mod total', (d) => {
    expect(idx(e, hoy, d)).toBe((base + d) % 3);
  });

  test.each([-1, -2, -3, -4, -1000])('desplazamiento negativo %i da un índice válido', (d) => {
    const r = entradaDelDia(e, hoy, d)!;
    expect(r.indice).toBeGreaterThanOrEqual(0);
    expect(r.indice).toBeLessThan(3);
    expect(r.indice).toBe((((base + d) % 3) + 3) % 3);
  });
});

describe('contenido real (desarrollo)', () => {
  test('hay 12 emociones y cada una tiene al menos una entrada', () => {
    expect(dev.emociones).toHaveLength(12);
    for (const em of dev.emociones) expect(em.items.length).toBeGreaterThan(0);
    for (const em of dev.emociones) expect(entradaDelDia(em, new Date(2026, 9, 3))).not.toBeNull();
  });

  test('"con <santo>" sale de la entrada del día (y cambia con el día)', () => {
    for (const em of dev.emociones) {
      const nombres = new Set<string>();
      for (let d = 0; d < em.items.length; d++) {
        const f = new Date(2026, 9, 3 + d, 12);
        const r = entradaDelDia(em, f)!;
        expect(r.entrada.c).toBe(em.items[r.indice].c);
        expect(r.entrada.c.es[0]).toBe(em.items[r.indice].c.es[0]);
        nombres.add(r.entrada.ref[0]);
      }
      // En `total` días seguidos aparecen todas las entradas (refs distintas).
      expect(nombres.size).toBe(new Set(em.items.map((i) => i.ref[0])).size);
    }
  });
});

describe('muestraAyuda y posicionAyuda', () => {
  const CON_AYUDA = ['depression', 'sad', 'lonely'];

  test('EMOCIONES_CON_AYUDA son exactamente Depresión, Triste y Soledad', () => {
    expect([...EMOCIONES_CON_AYUDA].sort()).toEqual([...CON_AYUDA].sort());
  });

  test('contenido real: true en las tres de cuidado, false en las otras 9', () => {
    const si = dev.emociones.filter(muestraAyuda).map((e) => e.id);
    expect(si.sort()).toEqual([...CON_AYUDA].sort());
    expect(dev.emociones.filter((e) => !muestraAyuda(e))).toHaveLength(9);
  });

  test('aunque se quite `care` del contenido, las tres siguen mostrando ayuda', () => {
    for (const em of dev.emociones) {
      const { care: _care, ...sinCare } = em;
      expect(muestraAyuda(sinCare as Emocion)).toBe(CON_AYUDA.includes(em.id));
    }
  });

  test('y en producción (items filtrados) también', () => {
    const prod = filtrarPorRevision(real, 'produccion');
    for (const em of prod.emociones) expect(muestraAyuda(em)).toBe(CON_AYUDA.includes(em.id));
  });

  test('posicionAyuda: arriba en Depresión, final en Triste y Soledad, null en el resto', () => {
    for (const em of dev.emociones) {
      const esperado = em.id === 'depression' ? 'arriba' : CON_AYUDA.includes(em.id) ? 'final' : null;
      expect(posicionAyuda(em)).toBe(esperado);
    }
  });

  test('fixture: una emoción sin entradas sigue mostrando ayuda si es de cuidado', () => {
    expect(muestraAyuda(emocion(0, 'depression'))).toBe(true);
    expect(posicionAyuda(emocion(0, 'depression'))).toBe('arriba');
    expect(posicionAyuda(emocion(0, 'lonely'))).toBe('final');
    expect(posicionAyuda(emocion(0, 'happy'))).toBeNull();
  });
});
