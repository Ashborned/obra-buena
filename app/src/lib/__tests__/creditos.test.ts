/// <reference types="jest" />
/*
 * Créditos de imágenes (Configuración → Acerca de) desde assets/manifiesto.json.
 */
import manifiesto from '../../../../assets/manifiesto.json';
import { creditosImagenes, type CreditoImagen } from '../creditos';

const c = (x: Partial<CreditoImagen>): Partial<CreditoImagen> => ({
  id: 'x',
  archivo: 'x.jpg',
  santo: 'pablo',
  obra: 'Obra',
  autor: 'Autor',
  anio: 1600,
  url_fuente: 'https://commons.wikimedia.org/wiki/File:x.jpg',
  licencia: 'Dominio público',
  ...x,
});

describe('creditosImagenes', () => {
  test('sin argumento usa el manifiesto real (hoy vacío → [])', () => {
    expect(Array.isArray(manifiesto)).toBe(true);
    expect(creditosImagenes()).toHaveLength((manifiesto as unknown[]).length);
  });

  test.each([[undefined], [null], [{}], ['texto'], [42]])('%p (no es lista) → []', (lista) => {
    // `undefined` usa el valor por defecto (el manifiesto real, hoy vacío).
    expect(creditosImagenes(lista)).toEqual([]);
  });

  test('ordena por autor y luego por obra', () => {
    const r = creditosImagenes([
      c({ id: '1', autor: 'Zurbarán', obra: 'B' }),
      c({ id: '2', autor: 'Caravaggio', obra: 'Z' }),
      c({ id: '3', autor: 'Caravaggio', obra: 'A' }),
    ]);
    expect(r.map((x) => x.id)).toEqual(['3', '2', '1']);
  });

  test('omite entradas sin obra, autor o licencia (y entradas nulas)', () => {
    const r = creditosImagenes([
      c({ id: 'ok' }),
      c({ id: 'sin-obra', obra: '' }),
      c({ id: 'sin-autor', autor: undefined }),
      c({ id: 'sin-licencia', licencia: '' }),
      null,
      undefined,
    ]);
    expect(r.map((x) => x.id)).toEqual(['ok']);
  });

  test('conserva todos los campos (anio texto o número, museo y notas opcionales)', () => {
    const e = c({ id: 'a', anio: 'c. 1601', museo: 'Prado', notas: 'detalle' });
    expect(creditosImagenes([e])).toEqual([e]);
  });

  test('no modifica la lista recibida', () => {
    const lista = [c({ id: '1', autor: 'Z' }), c({ id: '2', autor: 'A' })];
    const copia = JSON.parse(JSON.stringify(lista));
    creditosImagenes(lista);
    expect(lista).toEqual(copia);
  });
});
