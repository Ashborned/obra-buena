/// <reference types="jest" />
import {
  diasEntre,
  estadoNovena,
  inicioDelDia,
  proximaFiesta,
  sumarDias,
  type Fiesta,
} from '../novenas';

/*
 * Referencia: copia literal de `today()` e `info()` de prototype/obra-buena.html.
 * `new Date()` se controla con los temporizadores falsos de Jest (`enMaqueta`).
 */
/* eslint-disable */
// prettier-ignore
var DAY=86400000;
// prettier-ignore
function today(){var n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())}
// prettier-ignore
function info(n: any){
  var t: any=today(),y=t.getFullYear(),feast: any;
  if(n.fixed)feast=new Date(n.fixed[0],n.fixed[1]-1,n.fixed[2]);
  else{feast=new Date(y,n.m-1,n.d);if(feast<=t)feast=new Date(y+1,n.m-1,n.d)}
  var start: any=new Date(feast-9*DAY),end=new Date(feast-DAY),diff=Math.round((t-start)/DAY);
  var dayNum=diff>=0&&diff<9?diff+1:null;
  return {feast:feast,start:start,end:end,day:dayNum,until:dayNum?0:Math.round((start-t)/DAY)};
}
/* eslint-enable */

const ZONA = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Fecha local (año, mes 1–12, día, hora, minuto). */
const d = (a: number, m: number, dia: number, h = 0, min = 0) => new Date(a, m - 1, dia, h, min);
/** AAAA-MM-DD con los getters locales. */
const ymd = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

/** Ejecuta `info()` de la maqueta como si hoy fuera `hoy`. */
function enMaqueta(fiesta: Exclude<Fiesta, { calcular: unknown }>, hoy: Date) {
  const n = 'fecha' in fiesta ? { fixed: [fiesta.fecha.anio, fiesta.fecha.mes, fiesta.fecha.dia] } : { m: fiesta.mes, d: fiesta.dia };
  jest.setSystemTime(hoy);
  return info(n);
}

/** Verdad de referencia en UTC puro (sin zona horaria): AAAA-MM-DD de (a,m,d) + n días. */
const ymdUTC = (a: number, m: number, dia: number, n: number) =>
  new Date(Date.UTC(a, m - 1, dia + n)).toISOString().slice(0, 10);

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());

test('zona horaria de esta corrida', () => {
  // Se imprime para dejar evidencia de qué TZ se probó.
  console.log(`TZ=${process.env.TZ ?? '(sin definir)'} -> Intl: ${ZONA}`);
  expect(ZONA).toBeTruthy();
});

describe('utilidades de días civiles', () => {
  test('inicioDelDia descarta la hora', () => {
    expect(ymd(inicioDelDia(d(2026, 10, 3, 23, 59)))).toBe('2026-10-03');
    expect(inicioDelDia(d(2026, 10, 3, 23, 59)).getHours()).toBe(0);
  });
  test('sumarDias cruza meses y años', () => {
    expect(ymd(sumarDias(d(2026, 1, 1), -9))).toBe('2025-12-23');
    expect(ymd(sumarDias(d(2028, 3, 1), -1))).toBe('2028-02-29');
    expect(ymd(sumarDias(d(2027, 3, 1), -1))).toBe('2027-02-28');
  });
  test('diasEntre ignora la hora y es antisimétrica', () => {
    expect(diasEntre(d(2026, 9, 22, 23, 59), d(2026, 10, 1, 0, 0))).toBe(9);
    expect(diasEntre(d(2026, 10, 1), d(2026, 9, 22))).toBe(-9);
  });
});

describe('Santa Teresita (fiesta anual 1 oct)', () => {
  const ter: Fiesta = { mes: 10, dia: 1 };

  test('inicio = fiesta − 9 días, fin = víspera', () => {
    const e = estadoNovena(ter, d(2026, 9, 1));
    expect(ymd(e.fiesta)).toBe('2026-10-01');
    expect(ymd(e.inicio)).toBe('2026-09-22');
    expect(ymd(e.fin)).toBe('2026-09-30');
    expect(diasEntre(e.inicio, e.fiesta)).toBe(9);
    expect(diasEntre(e.fin, e.fiesta)).toBe(1);
  });

  test('21 sep -> faltan 1, sin novena en curso', () => {
    const e = estadoNovena(ter, d(2026, 9, 21));
    expect(e.dia).toBeNull();
    expect(e.faltan).toBe(1);
  });

  test('22 sep -> día 1', () => {
    const e = estadoNovena(ter, d(2026, 9, 22));
    expect(e.dia).toBe(1);
    expect(e.faltan).toBe(0);
  });

  test('cada día del 22 al 30 sep -> días 1 a 9', () => {
    for (let i = 0; i < 9; i++) {
      expect(estadoNovena(ter, d(2026, 9, 22 + i)).dia).toBe(i + 1);
    }
  });

  test('30 sep -> día 9', () => {
    expect(estadoNovena(ter, d(2026, 9, 30)).dia).toBe(9);
  });

  test('1 oct (día de la fiesta) -> "Hoy es su fiesta": se queda en la fiesta de este año', () => {
    const e = estadoNovena(ter, d(2026, 10, 1));
    expect(ymd(e.fiesta)).toBe('2026-10-01');
    expect(ymd(e.inicio)).toBe('2026-09-22');
    expect(e.esFiesta).toBe(true);
    expect(e.dia).toBeNull();
    expect(e.faltan).toBe(0);
    // Cambio aprobado: la maqueta saltaba al año siguiente ese mismo día.
    expect(ymd(enMaqueta(ter, d(2026, 10, 1)).feast)).toBe('2027-10-01');
  });

  test('2 oct (día siguiente) -> pasa a la fiesta del próximo año', () => {
    const e = estadoNovena(ter, d(2026, 10, 2));
    expect(ymd(e.fiesta)).toBe('2027-10-01');
    expect(ymd(e.inicio)).toBe('2027-09-22');
    expect(e.esFiesta).toBe(false);
    expect(e.dia).toBeNull();
    expect(e.faltan).toBe(355);
  });

  test('esFiesta solo el día de la fiesta (30 sep y 2 oct no)', () => {
    expect(estadoNovena(ter, d(2026, 9, 30)).esFiesta).toBe(false);
    expect(estadoNovena(ter, d(2026, 10, 1, 23, 59)).esFiesta).toBe(true);
    expect(estadoNovena(ter, d(2026, 10, 2, 0, 0)).esFiesta).toBe(false);
  });

  test('la hora de `hoy` no influye (00:00 vs 23:59)', () => {
    for (const dia of [21, 22, 30]) {
      expect(estadoNovena(ter, d(2026, 9, dia, 23, 59))).toEqual(estadoNovena(ter, d(2026, 9, dia, 0, 0)));
    }
    expect(estadoNovena(ter, d(2026, 10, 1, 23, 59))).toEqual(estadoNovena(ter, d(2026, 10, 1, 0, 0)));
    expect(ymd(proximaFiesta(ter, d(2026, 9, 30, 23, 59)))).toBe('2026-10-01');
  });

  test('las fechas devueltas son medianoche local', () => {
    const e = estadoNovena(ter, d(2026, 9, 25, 15, 30));
    for (const x of [e.fiesta, e.inicio, e.fin]) {
      expect([x.getHours(), x.getMinutes()]).toEqual([0, 0]);
    }
  });
});

describe('cambio de año', () => {
  test('fiesta 1 ene -> novena del 23 al 31 dic', () => {
    const e = estadoNovena({ mes: 1, dia: 1 }, d(2026, 12, 1));
    expect(ymd(e.fiesta)).toBe('2027-01-01');
    expect(ymd(e.inicio)).toBe('2026-12-23');
    expect(ymd(e.fin)).toBe('2026-12-31');
    expect(e.faltan).toBe(22);
  });

  test('fiesta 1 ene, hoy 23 dic -> día 1', () => {
    expect(estadoNovena({ mes: 1, dia: 1 }, d(2026, 12, 23)).dia).toBe(1);
  });

  test('fiesta 1 ene, hoy 31 dic -> día 9 y fiesta en el año siguiente', () => {
    const e = estadoNovena({ mes: 1, dia: 1 }, d(2026, 12, 31, 23, 59));
    expect(e.dia).toBe(9);
    expect(e.fiesta.getFullYear()).toBe(2027);
  });

  test('fiesta 1 ene, hoy 1 ene -> "Hoy es su fiesta" (la de este año)', () => {
    const e = estadoNovena({ mes: 1, dia: 1 }, d(2027, 1, 1));
    expect(ymd(e.fiesta)).toBe('2027-01-01');
    expect(e.esFiesta).toBe(true);
    expect(e.dia).toBeNull();
    expect(e.faltan).toBe(0);
  });

  test('fiesta 1 ene, hoy 2 ene -> pasa a la del año siguiente', () => {
    const e = estadoNovena({ mes: 1, dia: 1 }, d(2027, 1, 2));
    expect(ymd(e.fiesta)).toBe('2028-01-01');
    expect(ymd(e.inicio)).toBe('2027-12-23');
    expect(e.esFiesta).toBe(false);
  });

  test('fiesta 31 dic, hoy 31 dic -> fiesta; hoy 1 ene -> la del 31 dic de ese año', () => {
    const e = estadoNovena({ mes: 12, dia: 31 }, d(2026, 12, 31));
    expect(e.esFiesta).toBe(true);
    expect(ymd(e.fiesta)).toBe('2026-12-31');
    const s = estadoNovena({ mes: 12, dia: 31 }, d(2027, 1, 1));
    expect(s.esFiesta).toBe(false);
    expect(ymd(s.fiesta)).toBe('2027-12-31');
  });

  test('fiesta 5 ene, hoy 28 dic -> día 2 (inicio 27 dic, fin 4 ene)', () => {
    const e = estadoNovena({ mes: 1, dia: 5 }, d(2026, 12, 28));
    expect(ymd(e.fiesta)).toBe('2027-01-05');
    expect(ymd(e.inicio)).toBe('2026-12-27');
    expect(ymd(e.fin)).toBe('2027-01-04');
    expect(e.dia).toBe(2);
  });

  test('fiesta 5 ene, hoy 2 ene -> día 7', () => {
    expect(estadoNovena({ mes: 1, dia: 5 }, d(2027, 1, 2)).dia).toBe(7);
  });
});

describe('año bisiesto', () => {
  const feb29: Fiesta = { mes: 2, dia: 29 };
  const mar1: Fiesta = { mes: 3, dia: 1 };

  test('fiesta 29 feb en año bisiesto (2028): novena 20–28 feb', () => {
    const e = estadoNovena(feb29, d(2028, 2, 1));
    expect(ymd(e.fiesta)).toBe('2028-02-29');
    expect(ymd(e.inicio)).toBe('2028-02-20');
    expect(ymd(e.fin)).toBe('2028-02-28');
    expect(estadoNovena(feb29, d(2028, 2, 25)).dia).toBe(6);
  });

  test('convención: fiesta 29 feb en año no bisiesto se celebra el 28 feb (novena 19–27 feb)', () => {
    const e = estadoNovena(feb29, d(2027, 1, 10));
    expect(ymd(e.fiesta)).toBe('2027-02-28');
    expect(ymd(e.inicio)).toBe('2027-02-19');
    expect(ymd(e.fin)).toBe('2027-02-27');
    expect(estadoNovena(feb29, d(2027, 2, 19)).dia).toBe(1);
    expect(estadoNovena(feb29, d(2027, 2, 27)).dia).toBe(9);
    expect(estadoNovena(feb29, d(2027, 2, 28)).esFiesta).toBe(true);
    // Desde el 1 mar 2027 pasa al 29 feb de 2028 (bisiesto).
    expect(ymd(proximaFiesta(feb29, d(2027, 3, 1)))).toBe('2028-02-29');
    // Tras el 29 feb de 2028 vuelve a ser 28 feb en 2029.
    expect(ymd(proximaFiesta(feb29, d(2028, 3, 1)))).toBe('2029-02-28');
    // 1900 no fue bisiesto; 2000 sí.
    expect(ymd(proximaFiesta(feb29, d(1900, 1, 1)))).toBe('1900-02-28');
    expect(ymd(proximaFiesta(feb29, d(2000, 1, 1)))).toBe('2000-02-29');
  });

  test('fechas imposibles lanzan error en vez de correrse de mes', () => {
    expect(() => estadoNovena({ mes: 4, dia: 31 }, d(2027, 1, 1))).toThrow(RangeError);
    expect(() => estadoNovena({ mes: 2, dia: 30 }, d(2027, 1, 1))).toThrow(RangeError);
    expect(() => estadoNovena({ mes: 13, dia: 1 }, d(2027, 1, 1))).toThrow(RangeError);
    expect(() => estadoNovena({ mes: 1, dia: 0 }, d(2027, 1, 1))).toThrow(RangeError);
  });

  test('fiesta 1 mar: en bisiesto la novena incluye el 29 feb (21 feb–29 feb)', () => {
    const e = estadoNovena(mar1, d(2028, 1, 15));
    expect(ymd(e.inicio)).toBe('2028-02-21');
    expect(ymd(e.fin)).toBe('2028-02-29');
    expect(estadoNovena(mar1, d(2028, 2, 29)).dia).toBe(9);
  });

  test('fiesta 1 mar: en no bisiesto la novena es 20–28 feb', () => {
    const e = estadoNovena(mar1, d(2027, 1, 15));
    expect(ymd(e.inicio)).toBe('2027-02-20');
    expect(ymd(e.fin)).toBe('2027-02-28');
    expect(estadoNovena(mar1, d(2027, 2, 28)).dia).toBe(9);
  });
});

describe('fiesta fija (Corpus Christi 27 may 2027, de la maqueta)', () => {
  const cc: Fiesta = { fecha: { anio: 2027, mes: 5, dia: 27 } };

  test('antes: faltan positivo', () => {
    const e = estadoNovena(cc, d(2027, 5, 1));
    expect(ymd(e.inicio)).toBe('2027-05-18');
    expect(ymd(e.fin)).toBe('2027-05-26');
    expect(e.dia).toBeNull();
    expect(e.faltan).toBe(17);
  });

  test('durante: 18 may día 1, 26 may día 9', () => {
    expect(estadoNovena(cc, d(2027, 5, 18)).dia).toBe(1);
    expect(estadoNovena(cc, d(2027, 5, 26)).dia).toBe(9);
  });

  test('día de la fiesta: "Hoy es su fiesta", faltan 0', () => {
    const e = estadoNovena(cc, d(2027, 5, 27));
    expect(ymd(e.fiesta)).toBe('2027-05-27');
    expect(e.esFiesta).toBe(true);
    expect(e.dia).toBeNull();
    expect(e.faltan).toBe(0);
  });

  test('después: faltan negativo', () => {
    const e = estadoNovena(cc, d(2027, 6, 1));
    expect(e.dia).toBeNull();
    expect(e.faltan).toBe(-14);
  });

  test('coincide con la maqueta antes, durante y después', () => {
    // El día de la fiesta se excluye: ahí el módulo cambia a propósito (esFiesta).
    for (const hoy of [d(2027, 5, 1), d(2027, 5, 18), d(2027, 5, 26), d(2027, 6, 1)]) {
      const e = estadoNovena(cc, hoy);
      const m = enMaqueta(cc, hoy);
      expect([e.dia, e.faltan]).toEqual([m.day, m.until]);
    }
  });
});

/*
 * Horario de verano. Estos casos tienen sentido en cualquier zona, pero solo
 * fallan en la maqueta cuando la corrida usa la zona indicada (ver scripts/test-zonas.js).
 * Cambios de hora usados:
 *  - America/Santiago: 6 sep 2026 (00:00 -> 01:00; esa medianoche no existe), 5 abr 2026 y 4 abr 2027 (00:00 -> 23:00).
 *  - Europe/Madrid: 25 oct 2026 (03:00 -> 02:00), 28 mar 2027 (02:00 -> 03:00).
 *  - America/New_York: 1 nov 2026 (02:00 -> 01:00), 14 mar 2027 (02:00 -> 03:00).
 */
type CasoDST = {
  nombre: string;
  zona: string;
  fiesta: { anio: number; mes: number; dia: number };
  /** Lo que muestra la maqueta en esa zona (inicio y fin), si difiere de lo correcto. */
  maqueta?: { inicio?: string; fin?: string };
};

const casosDST: CasoDST[] = [
  { nombre: 'Santiago, adelanta 6 sep 2026 (fiesta 8 sep, Natividad de María)', zona: 'America/Santiago', fiesta: { anio: 2026, mes: 9, dia: 8 }, maqueta: { inicio: '2026-08-29' } },
  { nombre: 'Santiago, adelanta 6 sep 2026 (fiesta 7 sep: víspera tras el cambio)', zona: 'America/Santiago', fiesta: { anio: 2026, mes: 9, dia: 7 }, maqueta: { inicio: '2026-08-28', fin: '2026-09-05' } },
  { nombre: 'Santiago, atrasa 5 abr 2026 (fiesta 8 abr)', zona: 'America/Santiago', fiesta: { anio: 2026, mes: 4, dia: 8 } },
  { nombre: 'Santiago, atrasa 4 abr 2027 (fiesta 7 abr)', zona: 'America/Santiago', fiesta: { anio: 2027, mes: 4, dia: 7 } },
  { nombre: 'Madrid, atrasa 25 oct 2026 (fiesta 28 oct, Simón y Judas)', zona: 'Europe/Madrid', fiesta: { anio: 2026, mes: 10, dia: 28 } },
  { nombre: 'Madrid, adelanta 28 mar 2027 (fiesta 1 abr)', zona: 'Europe/Madrid', fiesta: { anio: 2027, mes: 4, dia: 1 }, maqueta: { inicio: '2027-03-22' } },
  { nombre: 'Nueva York, atrasa 1 nov 2026 (fiesta 4 nov, Carlos Borromeo)', zona: 'America/New_York', fiesta: { anio: 2026, mes: 11, dia: 4 } },
  { nombre: 'Nueva York, adelanta 14 mar 2027 (fiesta 19 mar, San José)', zona: 'America/New_York', fiesta: { anio: 2027, mes: 3, dia: 19 }, maqueta: { inicio: '2027-03-09' } },
];

describe(`horario de verano (${ZONA})`, () => {
  describe.each(casosDST)('$nombre', ({ zona, fiesta, maqueta }) => {
    const { anio, mes, dia } = fiesta;
    const inicioOk = ymdUTC(anio, mes, dia, -9);
    const finOk = ymdUTC(anio, mes, dia, -1);
    const f: Fiesta = { fecha: fiesta };

    test('módulo: inicio, fin y días 1–9 correctos en cada día de la novena', () => {
      const e = estadoNovena(f, d(anio, mes, dia));
      expect(ymd(e.inicio)).toBe(inicioOk);
      expect(ymd(e.fin)).toBe(finOk);
      for (let i = -2; i <= 10; i++) {
        const [a, m, dd] = ymdUTC(anio, mes, dia, -9 + i).split('-').map(Number);
        for (const [h, min] of [[0, 0], [12, 0], [23, 59]]) {
          const r = estadoNovena(f, d(a, m, dd, h, min));
          expect(r.dia).toBe(i >= 0 && i < 9 ? i + 1 : null);
          expect(r.faltan).toBe(i >= 0 && i <= 9 ? 0 : -i);
          expect(r.esFiesta).toBe(i === 9);
          expect(ymd(r.inicio)).toBe(inicioOk);
        }
      }
    });

    test('módulo: versión anual del mismo día da lo mismo', () => {
      const e = estadoNovena({ mes, dia }, d(anio, 1, 1));
      expect(ymd(e.inicio)).toBe(inicioOk);
      expect(ymd(e.fin)).toBe(finOk);
    });

    test(`maqueta en esta zona: ${ZONA === zona && maqueta ? 'FALLA' : 'pasa'}`, () => {
      const m = enMaqueta(f, d(anio, mes, dia));
      const esperadoInicio = ZONA === zona && maqueta?.inicio ? maqueta.inicio : inicioOk;
      const esperadoFin = ZONA === zona && maqueta?.fin ? maqueta.fin : finOk;
      expect(ymd(m.start)).toBe(esperadoInicio);
      expect(ymd(m.end)).toBe(esperadoFin);
      // Los números de día de la maqueta sí son correctos gracias a Math.round.
      for (let i = -2; i <= 10; i++) {
        const [a, mm, dd] = ymdUTC(anio, mes, dia, -9 + i).split('-').map(Number);
        const r = enMaqueta(f, d(a, mm, dd));
        expect(r.day).toBe(i >= 0 && i < 9 ? i + 1 : null);
      }
    });
  });
});

describe(`barrido: todas las fiestas fijas de 2026 a 2028 (${ZONA})`, () => {
  const fiestas: { anio: number; mes: number; dia: number }[] = [];
  for (let x = Date.UTC(2026, 0, 1); x <= Date.UTC(2028, 11, 31); x += 86_400_000) {
    const u = new Date(x);
    fiestas.push({ anio: u.getUTCFullYear(), mes: u.getUTCMonth() + 1, dia: u.getUTCDate() });
  }

  test('módulo: inicio y fin correctos para las 1096 fiestas', () => {
    const malos: string[] = [];
    for (const fiesta of fiestas) {
      const e = estadoNovena({ fecha: fiesta }, d(fiesta.anio, fiesta.mes, fiesta.dia));
      if (ymd(e.inicio) !== ymdUTC(fiesta.anio, fiesta.mes, fiesta.dia, -9) || ymd(e.fin) !== ymdUTC(fiesta.anio, fiesta.mes, fiesta.dia, -1)) {
        malos.push(ymdUTC(fiesta.anio, fiesta.mes, fiesta.dia, 0));
      }
    }
    expect(malos).toEqual([]);
  });

  test('módulo y maqueta: número de día y faltan para cada día −1..9 de cada fiesta', () => {
    const malosModulo: string[] = [];
    const malosMaqueta: string[] = [];
    for (const fiesta of fiestas) {
      const f: Fiesta = { fecha: fiesta };
      for (let i = -1; i <= 9; i++) {
        const [a, m, dd] = ymdUTC(fiesta.anio, fiesta.mes, fiesta.dia, -9 + i).split('-').map(Number);
        const hoy = d(a, m, dd);
        const diaOk = i >= 0 && i < 9 ? i + 1 : null;
        const e = estadoNovena(f, hoy);
        // Día de la fiesta (i = 9): el módulo da faltan 0 y esFiesta; la maqueta, −9.
        const faltanModulo = diaOk || i === 9 ? 0 : -i;
        if (e.dia !== diaOk || e.faltan !== faltanModulo || e.esFiesta !== (i === 9)) malosModulo.push(`${a}-${m}-${dd}`);
        const r = enMaqueta(f, hoy);
        if (r.day !== diaOk || r.until !== (diaOk ? 0 : -i)) malosMaqueta.push(`${a}-${m}-${dd}`);
      }
    }
    expect(malosModulo).toEqual([]);
    expect(malosMaqueta).toEqual([]);
  });

  test('maqueta: fiestas cuyo inicio o fin muestra un día equivocado', () => {
    const malos: string[] = [];
    for (const fiesta of fiestas) {
      const m = enMaqueta({ fecha: fiesta }, d(fiesta.anio, fiesta.mes, fiesta.dia));
      if (ymd(m.start) !== ymdUTC(fiesta.anio, fiesta.mes, fiesta.dia, -9) || ymd(m.end) !== ymdUTC(fiesta.anio, fiesta.mes, fiesta.dia, -1)) {
        malos.push(ymdUTC(fiesta.anio, fiesta.mes, fiesta.dia, 0));
      }
    }
    console.log(`[${ZONA}] maqueta: ${malos.length} fiestas con inicio/fin equivocado${malos.length ? ': ' + malos.join(', ') : ''}`);
    if (['America/Santiago', 'Europe/Madrid', 'America/New_York'].includes(ZONA)) {
      expect(malos.length).toBeGreaterThan(0);
    } else if (ZONA === 'UTC') {
      expect(malos).toEqual([]);
    }
  });
});
