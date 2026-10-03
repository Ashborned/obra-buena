/// <reference types="jest" />
/*
 * Datos de la pestaña Hoy (app/src/lib/hoy.ts) con el contenido real y con fixtures.
 */
// Sin @types/node en el proyecto (misma convención que region.test.ts).
declare const __dirname: string;
const { spawnSync } = require('child_process') as {
  spawnSync: (cmd: string, args: string[], o: object) => { status: number | null; stdout: string; stderr: string };
};
const path = require('path') as { resolve: (...p: string[]) => string; join: (...p: string[]) => string };

import datos from '../../../../content/contenido.json';
import { filtrarPorRevision } from '@/contenido/filtro';
import type { Contenido, Novena } from '@/contenido/tipos';

import { claveDia, horaDeOracion, novenaDelDia, rutaHistoriaSanto, santoDelDia } from '../hoy';

const real = datos as unknown as Contenido;

const f = (iso: string, hora = 12, min = 0) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d, hora, min);
};
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const novena = (id: string, fiesta: { m: number; d: number } | { fixed: number[] }): Novena =>
  ({ id, es: id, en: id, ini: 'X', revision: 'aprobado', ...fiesta }) as Novena;

describe('claveDia y rutaHistoriaSanto', () => {
  test('relleno de ceros', () => {
    expect(claveDia(f('2026-01-05'))).toBe('01-05');
    expect(claveDia(f('2026-10-01'))).toBe('10-01');
    expect(claveDia(f('2026-12-31'))).toBe('12-31');
  });
  test('la hora no cambia la clave', () => {
    expect(claveDia(f('2026-09-29', 0, 0))).toBe('09-29');
    expect(claveDia(f('2026-09-29', 23, 59))).toBe('09-29');
  });
  test('ruta de la historia', () => {
    expect(rutaHistoriaSanto('10-01')).toBe('/santo/10-01');
  });
});

describe('santoDelDia (contenido real)', () => {
  test.each([
    ['2026-09-28', '09-28', 'San Wenceslao', 'red'],
    ['2026-09-29', '09-29', 'Santos Miguel, Gabriel y Rafael', 'white'],
    ['2026-09-30', '09-30', 'San Jerónimo', 'white'],
    ['2026-10-01', '10-01', 'Santa Teresita del Niño Jesús', 'white'],
    ['2026-10-02', '10-02', 'Santos Ángeles Custodios', 'white'],
    ['2026-10-04', '10-04', 'San Francisco de Asís', 'white'],
  ])('%s → %s %s', (fecha, clave, nombre, lit) => {
    const s = santoDelDia(real, f(fecha));
    expect(s).not.toBeNull();
    expect(s!.clave).toBe(clave);
    expect(s!.santo.es[0]).toBe(nombre);
    expect(s!.santo.lit).toBe(lit);
    expect(s!.historia).toBe(real.historias_santos[clave]);
    expect(s!.historia!.es.st.length).toBeGreaterThan(0);
    expect(s!.historia!.en.st.length).toBeGreaterThan(0);
  });

  test.each(['2026-10-03', '2026-01-15', '2027-10-03'])('%s sin santo → null (nunca el de otro día)', (fecha) => {
    expect(santoDelDia(real, f(fecha))).toBeNull();
  });

  test('novena: Teresita el 10-01, null los demás días', () => {
    expect(santoDelDia(real, f('2026-10-01'))!.novena?.id).toBe('ter');
    for (const fecha of ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-02', '2026-10-04']) {
      expect(santoDelDia(real, f(fecha))!.novena).toBeNull();
    }
  });

  test('la hora no influye (00:00 vs 23:59)', () => {
    for (const fecha of ['2026-09-28', '2026-10-01', '2026-10-04']) {
      expect(santoDelDia(real, f(fecha, 0, 0))).toEqual(santoDelDia(real, f(fecha, 23, 59)));
    }
    expect(santoDelDia(real, f('2026-10-03', 0, 0))).toBeNull();
    expect(santoDelDia(real, f('2026-10-03', 23, 59))).toBeNull();
    expect(santoDelDia(real, f('2026-10-02', 23, 59))!.clave).toBe('10-02');
  });

  test('fixture: santo sin historia → historia null', () => {
    const c = {
      ...real,
      santos_del_dia: { '05-01': { ini: 'J', lit: 'white', rango: 'memoria_libre', es: ['a', 'b', 'c'], en: ['a', 'b', 'c'] } },
      historias_santos: {},
      novenas: [],
    } as Contenido;
    const s = santoDelDia(c, f('2026-05-01'));
    expect(s).not.toBeNull();
    expect(s!.historia).toBeNull();
    expect(s!.novena).toBeNull();
  });

  test('fixture: una novena móvil (`fixed`) no se toma como novena del santo', () => {
    const c = {
      ...real,
      santos_del_dia: { '05-27': { ini: 'X', lit: 'white', es: ['a', 'b', 'c'], en: ['a', 'b', 'c'] } },
      historias_santos: {},
      novenas: [novena('movil', { fixed: [2027, 5, 27] })],
    } as Contenido;
    expect(santoDelDia(c, f('2027-05-27'))!.novena).toBeNull();
  });
});

describe('horaDeOracion (bordes)', () => {
  test.each([
    [4, 59, 'night'],
    [5, 0, 'day'],
    [11, 59, 'day'],
    [12, 0, 'dusk'],
    [19, 59, 'dusk'],
    [20, 0, 'night'],
    [0, 0, 'night'],
    [23, 59, 'night'],
  ])('%i:%i → %s', (h, m, esperado) => {
    expect(horaDeOracion(f('2026-10-03', h, m))).toBe(esperado);
  });
});

describe('novenaDelDia', () => {
  describe('contenido real', () => {
    test('29 sep 2026 → Teresita, día 8 (gana sobre San Bruno en día 3)', () => {
      const r = novenaDelDia(real.novenas, f('2026-09-29'));
      expect(r?.novena.id).toBe('ter');
      expect(r?.estado.dia).toBe(8);
      expect(r?.estado.esFiesta).toBe(false);
    });
    test('1 oct 2026 → Teresita, hoy es su fiesta', () => {
      const r = novenaDelDia(real.novenas, f('2026-10-01'));
      expect(r?.novena.id).toBe('ter');
      expect(r?.estado.esFiesta).toBe(true);
      expect(r?.estado.dia).toBeNull();
    });
    test('3 oct 2026 → San Bruno, día 7', () => {
      const r = novenaDelDia(real.novenas, f('2026-10-03'));
      expect(r?.novena.id).toBe('bru');
      expect(r?.estado.dia).toBe(7);
    });
    test('15 ene 2026 → ninguna (null)', () => {
      expect(novenaDelDia(real.novenas, f('2026-01-15'))).toBeNull();
    });
    test('la hora no influye', () => {
      expect(novenaDelDia(real.novenas, f('2026-09-29', 0, 0))?.estado.dia).toBe(8);
      expect(novenaDelDia(real.novenas, f('2026-09-29', 23, 59))?.estado.dia).toBe(8);
    });
  });

  describe('fixtures', () => {
    test('sin novenas → null', () => {
      expect(novenaDelDia([], f('2026-10-01'))).toBeNull();
    });
    test('la fiesta de hoy gana sobre una novena en su día 9', () => {
      const ns = [novena('b', { m: 10, d: 2 }), novena('a', { m: 10, d: 1 })];
      const r = novenaDelDia(ns, f('2026-10-01'));
      expect(r?.novena.id).toBe('a');
      expect(r?.estado.esFiesta).toBe(true);
    });
    test('entre dos en curso, la más avanzada (sin importar el orden del arreglo)', () => {
      const a = novena('a', { m: 10, d: 5 }); // 1 oct: día 6
      const b = novena('b', { m: 10, d: 8 }); // 1 oct: día 3
      expect(novenaDelDia([b, a], f('2026-10-01'))?.novena.id).toBe('a');
      expect(novenaDelDia([a, b], f('2026-10-01'))?.novena.id).toBe('a');
      expect(novenaDelDia([b, a], f('2026-10-01'))?.estado.dia).toBe(6);
    });
    test('cambio de año: fiesta el 1 de enero', () => {
      const ns = [novena('ene', { m: 1, d: 1 })];
      expect(novenaDelDia(ns, f('2026-12-22'))).toBeNull();
      expect(novenaDelDia(ns, f('2026-12-23'))?.estado.dia).toBe(1);
      const dic31 = novenaDelDia(ns, f('2026-12-31'));
      expect(dic31?.estado.dia).toBe(9);
      expect(iso(dic31!.estado.fiesta)).toBe('2027-01-01');
      const ene1 = novenaDelDia(ns, f('2027-01-01'));
      expect(ene1?.estado.esFiesta).toBe(true);
      expect(iso(ene1!.estado.fiesta)).toBe('2027-01-01');
      expect(novenaDelDia(ns, f('2027-01-02'))).toBeNull();
    });
    test('fiesta móvil `fixed` (real: Corpus Christi 2027-05-27)', () => {
      expect(novenaDelDia(real.novenas, f('2027-05-18'))?.novena.id).toBe('cc');
      expect(novenaDelDia(real.novenas, f('2027-05-18'))?.estado.dia).toBe(1);
      expect(novenaDelDia(real.novenas, f('2027-05-26'))?.estado.dia).toBe(9);
      expect(novenaDelDia(real.novenas, f('2027-05-27'))?.estado.esFiesta).toBe(true);
      expect(novenaDelDia(real.novenas, f('2027-05-28'))).toBeNull();
      // Otro año: la fecha fija no se repite.
      expect(novenaDelDia(real.novenas, f('2026-05-20'))).toBeNull();
      expect(novenaDelDia(real.novenas, f('2028-05-20'))).toBeNull();
    });
    test('fixture `fixed` que cruza el año', () => {
      const ns = [novena('m', { fixed: [2027, 1, 3] })];
      expect(novenaDelDia(ns, f('2026-12-25'))?.estado.dia).toBe(1);
      expect(novenaDelDia(ns, f('2027-01-02'))?.estado.dia).toBe(9);
      expect(novenaDelDia(ns, f('2027-01-03'))?.estado.esFiesta).toBe(true);
    });
  });
});

describe('contenido', () => {
  test('el validador pasa', () => {
    const raiz = path.resolve(__dirname, '../../../..');
    const r = spawnSync(process.execPath, [path.join(raiz, 'scripts', 'validar-contenido.mjs')], {
      cwd: raiz,
      encoding: 'utf8',
    });
    if (r.status !== 0) console.log(r.stdout, r.stderr);
    expect(r.status).toBe(0);
  });
  test('evangelio_ejemplo: está en desarrollo y desaparece en producción', () => {
    expect(real.evangelio_ejemplo).toBeDefined();
    expect(real.evangelio_ejemplo!.revision).not.toBe('aprobado');
    expect(filtrarPorRevision(real, 'desarrollo').evangelio_ejemplo).toBeDefined();
    expect(filtrarPorRevision(real, 'produccion').evangelio_ejemplo).toBeUndefined();
  });
  test('santos del día siguen en producción (revisión en bloque aprobada)', () => {
    const prod = filtrarPorRevision(real, 'produccion');
    expect(santoDelDia(prod, f('2026-09-29'))?.santo.es[0]).toBe('Santos Miguel, Gabriel y Rafael');
  });
});
