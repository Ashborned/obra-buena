/// <reference types="jest" />
import datos from '../../../../content/contenido.json';
import { ayudaParaPais, normalizarPais, paisesConAyuda } from '../ayuda';
import { filtrarPorRevision } from '../filtro';
import type { Ayuda, Contenido } from '../tipos';

const real = datos as unknown as Contenido;
const ayudaDev = filtrarPorRevision(real, 'desarrollo').ayuda;

describe('normalizarPais', () => {
  test.each([
    ['cl', 'CL'],
    [' CL ', 'CL'],
    ['US', 'US'],
    ['es', 'ES'],
  ])('%p → %p', (entrada, salida) => {
    expect(normalizarPais(entrada)).toBe(salida);
  });

  test.each([[''], [null], [undefined], ['CHL'], ['419'], ['C1'], ['   '], ['C'], ['es-CL']])(
    '%p → null',
    (entrada) => {
      expect(normalizarPais(entrada as string | null | undefined)).toBeNull();
    },
  );
});

describe('ayudaParaPais con el JSON real (desarrollo)', () => {
  test.each(['CL', 'US', 'ES'])('%s → líneas de ese país y de ningún otro', (codigo) => {
    const r = ayudaParaPais(ayudaDev, codigo.toLowerCase());
    expect(r.tipo).toBe('pais');
    if (r.tipo !== 'pais') return;
    expect(r.pais.pais).toBe(codigo);
    expect(r.pais.lineas.length).toBeGreaterThan(0);
    const propias = real.ayuda.paises.find((p) => p.pais === codigo)!.lineas;
    expect(r.pais.lineas).toEqual(propias);
    const ajenas = real.ayuda.paises
      .filter((p) => p.pais !== codigo)
      .flatMap((p) => p.lineas.map((l) => l.marcar));
    for (const l of r.pais.lineas) expect(ajenas).not.toContain(l.marcar);
    expect(r.respaldo).toEqual(real.ayuda.respaldo);
  });

  test.each([['FR'], ['JP'], ['ZZ'], [null], [undefined], [''], ['CHL'], ['419']])(
    '%p → respaldo Find A Helpline, sin líneas',
    (codigo) => {
      const r = ayudaParaPais(ayudaDev, codigo as string | null | undefined);
      expect(r.tipo).toBe('respaldo');
      expect(r).not.toHaveProperty('pais.lineas');
      expect(new URL(r.respaldo.url).hostname).toMatch(/(^|\.)findahelpline\.com$/);
      expect(r.respaldo.nota.es).toMatch(/emergencia/i);
      expect(r.respaldo.nota.en).toMatch(/emergency/i);
    },
  );

  test('el respaldo informa el país normalizado (o null si es inválido)', () => {
    expect(ayudaParaPais(ayudaDev, 'fr')).toMatchObject({ tipo: 'respaldo', pais: 'FR' });
    expect(ayudaParaPais(ayudaDev, '419')).toMatchObject({ tipo: 'respaldo', pais: null });
  });
});

describe('ayudaParaPais: nunca un número no verificado como local', () => {
  test('país con datos pero no aprobado, tras filtrar en producción → respaldo', () => {
    const prod = filtrarPorRevision(real, 'produccion').ayuda;
    for (const p of real.ayuda.paises.filter((x) => x.revision !== 'aprobado')) {
      expect(ayudaParaPais(prod, p.pais).tipo).toBe('respaldo');
    }
    // Fixture: CL aprobado, US en borrador.
    const fix: Ayuda = {
      respaldo: real.ayuda.respaldo,
      paises: [
        { ...real.ayuda.paises.find((p) => p.pais === 'CL')!, revision: 'aprobado' },
        { ...real.ayuda.paises.find((p) => p.pais === 'US')!, revision: 'borrador' },
      ],
    };
    const c = filtrarPorRevision({ ...real, ayuda: fix }, 'produccion').ayuda;
    expect(ayudaParaPais(c, 'CL').tipo).toBe('pais');
    expect(ayudaParaPais(c, 'US').tipo).toBe('respaldo');
  });

  test('país con lineas: [] → respaldo', () => {
    const fix: Ayuda = {
      respaldo: real.ayuda.respaldo,
      paises: [{ ...real.ayuda.paises[0], pais: 'PE', lineas: [], revision: 'aprobado' }],
    };
    expect(ayudaParaPais(fix, 'PE')).toMatchObject({ tipo: 'respaldo', pais: 'PE' });
  });
});

describe('paisesConAyuda', () => {
  test('solo países con líneas', () => {
    const fix: Ayuda = {
      respaldo: real.ayuda.respaldo,
      paises: [
        { ...real.ayuda.paises[0], pais: 'CL' },
        { ...real.ayuda.paises[0], pais: 'PE', lineas: [] },
        { ...real.ayuda.paises[0], pais: 'US' },
      ],
    };
    expect(paisesConAyuda(fix)).toEqual(['CL', 'US']);
  });

  test('con el JSON real: los países con líneas (incluye CL, US, ES)', () => {
    const lista = paisesConAyuda(ayudaDev);
    expect(lista).toEqual(expect.arrayContaining(['CL', 'US', 'ES']));
    expect(lista).toEqual(
      real.ayuda.paises.filter((p) => p.lineas.length > 0).map((p) => p.pais),
    );
  });
});

describe('normalizarPais: entradas no ASCII', () => {
  // Se valida antes de pasar a mayúsculas: "ß".toUpperCase() es "SS" e "ıd" pasaría a "ID".
  test.each([['ß'], ['ıd'], ['ﬀ']])('%p → null', (entrada) => {
    expect(normalizarPais(entrada)).toBeNull();
  });
});
