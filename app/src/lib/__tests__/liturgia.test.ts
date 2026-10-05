/// <reference types="jest" />
/*
 * Tiempo litúrgico y color del día (app/src/lib/liturgia.ts).
 * Referencias: Normas universales sobre el año litúrgico y el calendario (NUALC, 1969),
 * tabla de precedencia (n.º 59) y n.º 60 (coincidencias); fechas de Pascua verificables
 * en cualquier tabla del calendario gregoriano.
 */
import datos from '../../../../content/contenido.json';
import type { Contenido, RangoCelebracion, SantoDelDia } from '@/contenido/tipos';

import { colorLiturgicoDelDia } from '../hoy';
import {
  bautismoDelSenor,
  colorDelDia,
  colorDelTiempo,
  pascua,
  primerDomingoAdviento,
  tiempoLiturgico,
  type ColorLiturgico,
} from '../liturgia';

const real = datos as unknown as Contenido;

/** Fecha local a mediodía (la hora no debe influir). */
const f = (iso: string, hora = 12) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d, hora, 0);
};
/** `YYYY-MM-DD` de una fecha local. */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const cel = (lit: ColorLiturgico, rango?: RangoCelebracion) => ({ lit, rango });

describe('pascua (algoritmo gregoriano)', () => {
  test.each([
    [2000, '2000-04-23'],
    [2008, '2008-03-23'],
    [2019, '2019-04-21'],
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [1943, '1943-04-25'], // máximo histórico (25 de abril)
    [2038, '2038-04-25'], // máximo
    [1818, '1818-03-22'], // mínimo histórico (22 de marzo)
    [2285, '2285-03-22'], // mínimo
  ])('%i → %s', (anio, esperado) => {
    const p = pascua(anio);
    expect(iso(p)).toBe(esperado);
    expect(p.getDay()).toBe(0);
  });

  test('siempre entre el 22 de marzo y el 25 de abril, en domingo (1583–3000)', () => {
    for (let a = 1583; a <= 3000; a++) {
      const p = pascua(a);
      expect(p.getDay()).toBe(0);
      const md = (p.getMonth() + 1) * 100 + p.getDate();
      expect(md).toBeGreaterThanOrEqual(322);
      expect(md).toBeLessThanOrEqual(425);
    }
  });
});

describe('primerDomingoAdviento', () => {
  test.each([
    [2024, '2024-12-01'],
    [2025, '2025-11-30'],
    [2026, '2026-11-29'],
    [2027, '2027-11-28'],
    [2022, '2022-11-27'], // 27 de noviembre en domingo
    [2023, '2023-12-03'], // 3 de diciembre
  ])('%i → %s', (anio, esperado) => {
    expect(iso(primerDomingoAdviento(anio))).toBe(esperado);
  });
});

describe('bautismoDelSenor (calendario universal, Epifanía el 6 de enero)', () => {
  test('6 de enero en domingo (2019) → domingo siguiente, 13 de enero', () => {
    expect(iso(bautismoDelSenor(2019))).toBe('2019-01-13');
  });
  test('6 de enero en sábado (2024) → 7 de enero', () => {
    expect(iso(bautismoDelSenor(2024))).toBe('2024-01-07');
  });
  test('2026 (6 de enero en martes) → 11 de enero', () => {
    expect(iso(bautismoDelSenor(2026))).toBe('2026-01-11');
  });
});

describe('colorDelTiempo (2026: Pascua el 5 de abril)', () => {
  test.each([
    ['2026-01-01', 'white', 'Santa María, Madre de Dios (Navidad)'],
    ['2026-01-11', 'white', 'Bautismo del Señor (último día de Navidad)'],
    ['2026-01-12', 'green', 'día siguiente al Bautismo: tiempo ordinario'],
    ['2026-02-17', 'green', 'víspera de Ceniza'],
    ['2026-02-18', 'purple', 'Miércoles de Ceniza'],
    ['2026-03-15', 'rose', 'Laetare (IV domingo de Cuaresma)'],
    ['2026-03-16', 'purple', 'lunes después de Laetare'],
    ['2026-03-29', 'red', 'Domingo de Ramos'],
    ['2026-03-30', 'purple', 'Lunes Santo'],
    ['2026-04-02', 'white', 'Jueves Santo'],
    ['2026-04-03', 'red', 'Viernes Santo'],
    ['2026-04-04', 'purple', 'Sábado Santo'],
    ['2026-04-05', 'white', 'Domingo de Pascua'],
    ['2026-05-14', 'white', 'Ascensión (fecha universal, jueves)'],
    ['2026-05-24', 'red', 'Pentecostés'],
    ['2026-05-25', 'green', 'lunes después de Pentecostés'],
    ['2026-07-15', 'green', 'tiempo ordinario'],
    ['2026-11-28', 'green', 'sábado antes de Adviento'],
    ['2026-11-29', 'purple', 'I domingo de Adviento'],
    ['2026-12-13', 'rose', 'Gaudete (III domingo de Adviento)'],
    ['2026-12-24', 'purple', '24 de diciembre'],
    ['2026-12-25', 'white', 'Navidad'],
    ['2026-12-31', 'white', 'octava de Navidad'],
  ])('%s → %s (%s)', (fecha, esperado) => {
    expect(colorDelTiempo(f(fecha))).toBe(esperado);
  });

  test('Laetare y Gaudete en otro año (2027: Pascua 28 mar)', () => {
    expect(colorDelTiempo(f('2027-03-07'))).toBe('rose'); // Laetare
    expect(colorDelTiempo(f('2027-12-12'))).toBe('rose'); // Gaudete
  });

  test('la hora del día no cambia el color (00:00 y 23:59)', () => {
    expect(colorDelTiempo(new Date(2026, 3, 3, 0, 0))).toBe('red');
    expect(colorDelTiempo(new Date(2026, 3, 3, 23, 59))).toBe('red');
    expect(colorDelTiempo(new Date(2026, 3, 4, 0, 0))).toBe('purple');
  });

  test('tiempoLiturgico en los bordes', () => {
    expect(tiempoLiturgico(f('2026-01-11'))).toBe('navidad');
    expect(tiempoLiturgico(f('2026-01-12'))).toBe('ordinario');
    expect(tiempoLiturgico(f('2026-02-18'))).toBe('cuaresma');
    expect(tiempoLiturgico(f('2026-04-01'))).toBe('cuaresma');
    expect(tiempoLiturgico(f('2026-04-02'))).toBe('triduo');
    expect(tiempoLiturgico(f('2026-04-04'))).toBe('triduo');
    expect(tiempoLiturgico(f('2026-04-05'))).toBe('pascua');
    expect(tiempoLiturgico(f('2026-05-24'))).toBe('pascua');
    expect(tiempoLiturgico(f('2026-05-25'))).toBe('ordinario');
    expect(tiempoLiturgico(f('2026-11-29'))).toBe('adviento');
    expect(tiempoLiturgico(f('2026-12-25'))).toBe('navidad');
  });
});

describe('colorDelDia / colorLiturgicoDelDia', () => {
  describe('con el contenido real (2026)', () => {
    test('memoria libre: San Wenceslao (lun 28 sep) → verde, no rojo', () => {
      expect(real.santos_del_dia['09-28'].rango).toBe('memoria_libre');
      expect(real.santos_del_dia['09-28'].lit).toBe('red');
      expect(colorLiturgicoDelDia(real, f('2026-09-28'))).toBe('green');
    });
    test('fiesta en día de semana: Arcángeles (mar 29 sep) → blanco', () => {
      expect(colorLiturgicoDelDia(real, f('2026-09-29'))).toBe('white');
    });
    test('memoria en día de semana: Teresita (jue 1 oct) → blanco', () => {
      expect(colorLiturgicoDelDia(real, f('2026-10-01'))).toBe('white');
    });
    test('memoria en domingo: San Francisco (dom 4 oct) → verde', () => {
      expect(colorLiturgicoDelDia(real, f('2026-10-04'))).toBe('green');
    });
    test('memoria en día de semana otro año: San Francisco (lun 4 oct 2027) → blanco', () => {
      expect(colorLiturgicoDelDia(real, f('2027-10-04'))).toBe('white');
    });
    test('día sin santo → color del tiempo (3 oct, 15 ene)', () => {
      expect(colorLiturgicoDelDia(real, f('2026-10-03'))).toBe('green');
      expect(colorLiturgicoDelDia(real, f('2026-01-15'))).toBe('green');
      expect(colorLiturgicoDelDia(real, f('2026-02-18'))).toBe('purple');
    });
  });

  describe('con fixtures (casos que el contenido real no tiene)', () => {
    test('sin celebración o sin rango → tiempo', () => {
      expect(colorDelDia(f('2026-07-15'))).toBe('green');
      expect(colorDelDia(f('2026-07-15'), null)).toBe('green');
      expect(colorDelDia(f('2026-07-15'), cel('red'))).toBe('green');
    });
    test('memoria en Cuaresma: Perpetua y Felicidad (sáb 7 mar 2026) → morado', () => {
      expect(colorDelDia(f('2026-03-07'), cel('red', 'memoria'))).toBe('purple');
    });
    test('memoria entre 17 y 24 dic (lun 21 dic 2026) → morado', () => {
      expect(colorDelDia(f('2026-12-21'), cel('white', 'memoria'))).toBe('purple');
      expect(colorDelDia(f('2026-12-17'), cel('white', 'memoria'))).toBe('purple');
    });
    test('memoria en Adviento antes del 17 dic (mié 16 dic 2026) → color del santo', () => {
      expect(colorDelDia(f('2026-12-16'), cel('white', 'memoria'))).toBe('white');
      expect(colorDelDia(f('2026-12-14'), cel('red', 'memoria'))).toBe('red'); // lunes; p. ej. Santa Lucía en lunes
    });
    test('memoria libre roja en Pascua → blanco del tiempo', () => {
      expect(colorDelDia(f('2026-04-23'), cel('red', 'memoria_libre'))).toBe('white');
    });
    test('solemnidad en domingo del tiempo ordinario (Todos los Santos, dom 1 nov 2026) → color del santo', () => {
      expect(colorDelDia(f('2026-11-01'), cel('white', 'solemnidad'))).toBe('white');
      expect(colorDelDia(f('2027-08-15'), cel('white', 'solemnidad'))).toBe('white'); // Asunción en domingo
    });
    test('solemnidad en día de semana de Cuaresma (San José, jue 19 mar 2026) → blanco', () => {
      expect(colorDelDia(f('2026-03-19'), cel('white', 'solemnidad'))).toBe('white');
    });
    test('solemnidad en Semana Santa (Anunciación, lun 25 mar 2024) → tiempo (morado)', () => {
      expect(colorDelDia(f('2024-03-25'), cel('white', 'solemnidad'))).toBe('purple');
    });
    test('solemnidad en la octava de Pascua → blanco del tiempo; Ramos → rojo', () => {
      expect(colorDelDia(f('2026-04-07'), cel('red', 'solemnidad'))).toBe('white');
      expect(colorDelDia(f('2026-03-29'), cel('white', 'solemnidad'))).toBe('red');
    });
    test('solemnidad en domingo de Cuaresma (San José, dom 19 mar 2028) → morado', () => {
      expect(colorDelDia(f('2028-03-19'), cel('white', 'solemnidad'))).toBe('purple');
    });
    test('fiesta en domingo de Adviento (San Andrés, dom 30 nov 2025) → morado', () => {
      expect(colorDelDia(f('2025-11-30'), cel('red', 'fiesta'))).toBe('purple');
    });
    test('fiesta en Miércoles de Ceniza → morado', () => {
      expect(colorDelDia(f('2026-02-18'), cel('red', 'fiesta'))).toBe('purple');
    });
    test('fiesta en día de semana de Cuaresma → color del santo (la fiesta prevalece sobre la feria, NUALC 59)', () => {
      expect(colorDelDia(f('2026-02-23'), cel('red', 'fiesta'))).toBe('red');
    });
    test('fiesta en domingo del tiempo ordinario → verde (el domingo prevalece)', () => {
      expect(colorDelDia(f('2026-07-26'), cel('red', 'fiesta'))).toBe('green');
    });
    test('memoria en Laetare/Gaudete → rosado', () => {
      expect(colorDelDia(f('2026-03-15'), cel('white', 'memoria'))).toBe('rose');
      expect(colorDelDia(f('2026-12-13'), cel('red', 'memoria'))).toBe('rose');
    });
  });

  /*
   * Celebraciones móviles del Calendario Romano General derivadas de la Pascua (NUALC 59).
   * El tiempo sigue siendo ordinario (verde); el color del día es el de la celebración.
   */
  describe('celebraciones móviles (2026)', () => {
    test.each([
      ['2026-05-31', 'Santísima Trinidad (domingo después de Pentecostés)'],
      ['2026-06-04', 'Corpus Christi (jueves después de la Trinidad, fecha universal)'],
      ['2026-06-12', 'Sagrado Corazón (viernes después del II domingo después de Pentecostés)'],
      ['2026-11-22', 'Jesucristo, Rey del Universo (último domingo del tiempo ordinario)'],
      ['2026-05-25', 'María, Madre de la Iglesia (lunes después de Pentecostés, memoria)'],
      ['2026-06-13', 'Inmaculado Corazón de María (sábado después del Sagrado Corazón, memoria)'],
    ])('%s → blanco (%s)', (fecha) => {
      expect(colorDelTiempo(f(fecha))).toBe('green');
      expect(colorDelDia(f(fecha), null)).toBe('white');
    });

    test('la solemnidad móvil gana a una memoria del santo ese día', () => {
      expect(colorDelDia(f('2026-06-12'), cel('red', 'memoria'))).toBe('white');
    });

    test('un día cualquiera del tiempo ordinario sigue verde', () => {
      expect(colorDelDia(f('2026-06-10'), null)).toBe('green');
    });
  });
});

// Asegura que el tipo del fixture sigue el del contenido.
const _tipo: Pick<SantoDelDia, 'lit' | 'rango'> = cel('white', 'memoria');
void _tipo;

describe('Corpus Christi en el color del día según el país', () => {
  test('jueves en general; domingo donde se traslada', () => {
    // 2026: Pascua 5 abr → jueves 4 jun, domingo 7 jun.
    expect(colorDelDia(new Date(2026, 5, 4), null)).toBe('white');
    expect(colorDelDia(new Date(2026, 5, 7), null)).toBe('green');
    expect(colorDelDia(new Date(2026, 5, 4), null, { corpusEnDomingo: true })).toBe('green');
    expect(colorDelDia(new Date(2026, 5, 7), null, { corpusEnDomingo: true })).toBe('white');
  });
});
