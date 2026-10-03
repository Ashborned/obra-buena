/// <reference types="jest" />
/*
 * Todos los idiomas de IDIOMAS tienen exactamente las mismas claves que es.json (la referencia).
 * Los sufijos de plural (_zero, _one, _few, …) se ignoran: cada idioma usa las formas que pide
 * su gramática, pero la clave base debe existir en todos.
 */
import { IDIOMAS } from '..';

jest.mock('../../lib/preferencias', () => ({
  leerIdioma: () => null,
  guardarIdioma: () => {},
}));

const SUFIJO_PLURAL = /_(zero|one|two|few|many|other)$/;

function claves(objeto: object, prefijo = ''): string[] {
  return Object.entries(objeto).flatMap(([clave, valor]) => {
    if (typeof valor === 'string') return [`${prefijo}${clave}`.replace(SUFIJO_PLURAL, '')];
    return claves(valor as object, `${prefijo}${clave}.`);
  });
}

const referencia = [...new Set(claves(IDIOMAS.es))].sort();

describe.each(Object.keys(IDIOMAS))('locales/%s.json', (idioma) => {
  const propias = [...new Set(claves(IDIOMAS[idioma as keyof typeof IDIOMAS]))].sort();

  it('tiene las mismas claves que es.json', () => {
    expect(propias).toEqual(referencia);
  });
});
