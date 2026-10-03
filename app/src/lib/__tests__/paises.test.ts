/// <reference types="jest" />
import type { Ayuda } from '../../contenido/tipos';
import { filtrarPaises, nombrePais, normalizarBusqueda, seccionesPaises } from '../paises';

const ayuda = {
  respaldo: { nombre: { es: 'R', en: 'R' }, url: '', nota: { es: '', en: '' }, fuente: '' },
  paises: [
    { pais: 'MX', nombre: { es: 'México', en: 'Mexico' }, lineas: [], verificado: '', revision: 'borrador' },
    { pais: 'CL', nombre: { es: 'Chile', en: 'Chile' }, lineas: [], verificado: '', revision: 'borrador' },
  ],
} as unknown as Ayuda;

const nombre = (c: string) => nombrePais(c, 'es', ayuda);

// Jest corre en Node, que sí trae Intl.DisplayNames; se quita para probar lo que pasa en Hermes.
const intl = Intl as { DisplayNames?: unknown };
const displayNamesOriginal = intl.DisplayNames;
beforeAll(() => {
  delete intl.DisplayNames;
});
afterAll(() => {
  intl.DisplayNames = displayNamesOriginal;
});

describe('nombrePais (sin Intl.DisplayNames, como en Hermes)', () => {
  it('usa el nombre del contenido en el idioma pedido y, si no hay, el código', () => {
    expect(nombrePais('MX', 'es', ayuda)).toBe('México');
    expect(nombrePais('MX', 'en', ayuda)).toBe('Mexico');
    expect(nombrePais('MX', 'fr', ayuda)).toBe('Mexico');
    expect(nombrePais('PE', 'es', ayuda)).toBe('PE');
  });
});

describe('seccionesPaises', () => {
  it('pone primero el país del teléfono y no lo repite en las demás', () => {
    const s = seccionesPaises({ sistema: 'CL', conAyuda: ['MX', 'CL'], nombre, idioma: 'es' });
    expect(s).toEqual([
      { id: 'telefono', codigos: ['CL'] },
      { id: 'ayuda', codigos: ['MX'] },
    ]);
  });

  it('omite secciones vacías (teléfono sin región, sin datos aprobados)', () => {
    expect(seccionesPaises({ sistema: null, conAyuda: [], nombre, idioma: 'es' })).toEqual([]);
  });

  it('muestra el país elegido aunque no esté en ninguna lista', () => {
    const s = seccionesPaises({ actual: 'PE', sistema: 'CL', conAyuda: [], nombre, idioma: 'es' });
    expect(s[0]).toEqual({ id: 'actual', codigos: ['PE'] });
  });
});

describe('búsqueda', () => {
  it('ignora mayúsculas y tildes, y acepta el código', () => {
    expect(normalizarBusqueda('  MÉXICO ')).toBe('mexico');
    expect(filtrarPaises(['MX', 'CL'], 'mexi', nombre)).toEqual(['MX']);
    expect(filtrarPaises(['MX', 'CL'], 'cl', nombre)).toEqual(['CL']);
    expect(filtrarPaises(['MX', 'CL'], '', nombre)).toEqual(['MX', 'CL']);
  });
});
