/// <reference types="jest" />
/*
 * Hito 7 · Configuración → País: al cambiar el país cambian las líneas de ayuda.
 *
 * Contenido de prueba con dos países aprobados (AR y MX, números ficticios que no existen) y uno
 * en borrador (PE). Se recorre el cambio de país como lo hace la app: guardar → releer → elegir.
 * Nunca debe aparecer el número de otro país; sin país o sin líneas → Find A Helpline.
 */
import { ayudaParaPais } from '../ayuda';
import { filtrarPorRevision } from '../filtro';
import type { Ayuda, AyudaPais, Contenido } from '../tipos';

const mockKV: Record<string, string> = {};
jest.mock('expo-sqlite/kv-store', () => {
  const Storage = {
    getItemSync: (k: string) => (k in mockKV ? mockKV[k] : null),
    setItemAsync: async (k: string, v: string) => {
      mockKV[k] = v;
    },
  };
  return { __esModule: true, default: Storage, Storage };
});

const mockGetLocales = jest.fn();
jest.mock('expo-localization', () => ({ getLocales: () => mockGetLocales() }));

import { guardarPais, leerPais } from '@/lib/preferencias';
import { paisInicial } from '@/lib/region';

const pais = (codigo: string, numeros: string[], revision: AyudaPais['revision'] = 'aprobado'): AyudaPais => ({
  pais: codigo,
  nombre: { es: `País ${codigo}`, en: `Country ${codigo}` },
  emergencia: `9${codigo}`,
  lineas: numeros.map((n) => ({
    nombre: { es: `Línea ${n}`, en: `Line ${n}` },
    numero: n,
    marcar: n,
    detalle: { es: '24/7', en: '24/7' },
    fuente: `https://ejemplo.invalid/${codigo}`,
  })),
  verificado: '2026-10-01',
  revision,
});

const AYUDA: Ayuda = {
  respaldo: {
    nombre: { es: 'Find A Helpline', en: 'Find A Helpline' },
    url: 'https://findahelpline.com',
    nota: { es: 'Llama al número de emergencias local.', en: 'Call your local emergency number.' },
    fuente: 'https://findahelpline.com',
  },
  paises: [pais('AR', ['1111', '1112']), pais('MX', ['2221']), pais('PE', ['3331'], 'borrador'), pais('UY', [])],
};
const PROD = filtrarPorRevision({ ayuda: AYUDA } as unknown as Contenido, 'produccion').ayuda;

const todosLosNumeros = AYUDA.paises.flatMap((p) => p.lineas.map((l) => l.marcar));
const numerosDe = (codigo: string) => AYUDA.paises.find((p) => p.pais === codigo)!.lineas.map((l) => l.marcar);

/** Lo que la tarjeta mostraría: números de líneas (o ninguno si es respaldo). */
function numerosMostrados(ayuda: Ayuda, codigo: string | null) {
  const r = ayudaParaPais(ayuda, codigo);
  return r.tipo === 'pais' ? r.pais.lineas.map((l) => l.marcar) : [];
}

/** Cambiar el país en Configuración y "reabrir": guardar → leer lo guardado → elegir la ayuda. */
async function cambiarPais(codigo: string) {
  guardarPais(codigo);
  await new Promise((r) => setTimeout(r, 0));
  return ayudaParaPais(PROD, leerPais());
}

beforeEach(() => {
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  mockGetLocales.mockReset().mockReturnValue([]);
});

describe('cambiar de país cambia las líneas', () => {
  test('AR → MX → AR: cada vez solo las del país elegido', async () => {
    const ar = await cambiarPais('AR');
    expect(ar.tipo).toBe('pais');
    expect(numerosMostrados(PROD, leerPais())).toEqual(['1111', '1112']);

    const mx = await cambiarPais('MX');
    expect(mx).toMatchObject({ tipo: 'pais', pais: { pais: 'MX' } });
    expect(numerosMostrados(PROD, leerPais())).toEqual(['2221']);

    await cambiarPais('AR');
    expect(numerosMostrados(PROD, leerPais())).toEqual(['1111', '1112']);
  });

  test.each(['AR', 'MX'])('%s: ningún número de otro país', (codigo) => {
    const propios = numerosMostrados(PROD, codigo);
    expect(propios).toEqual(numerosDe(codigo));
    const ajenos = todosLosNumeros.filter((n) => !numerosDe(codigo).includes(n));
    for (const n of propios) expect(ajenos).not.toContain(n);
  });

  test('el país elegido manda sobre la región del teléfono', async () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'es', regionCode: 'AR' }]);
    expect(paisInicial()).toBe('AR');
    guardarPais('MX');
    await new Promise((r) => setTimeout(r, 0));
    expect(paisInicial()).toBe('MX');
    expect(numerosMostrados(PROD, paisInicial())).toEqual(['2221']);
  });
});

describe('sin líneas → respaldo Find A Helpline (sin números)', () => {
  test.each([
    ['PE (en borrador, filtrado en producción)', 'PE'],
    ['UY (sin líneas)', 'UY'],
    ['FR (sin datos)', 'FR'],
    ['null', null],
    ['ZZ ("prefiero no decirlo")', 'ZZ'],
  ])('%s', (_n, codigo) => {
    const r = ayudaParaPais(PROD, codigo);
    expect(r.tipo).toBe('respaldo');
    expect(numerosMostrados(PROD, codigo)).toEqual([]);
    expect(new URL(r.respaldo.url).hostname).toBe('findahelpline.com');
    expect(r.respaldo.nota.es).toMatch(/emergencia/i);
    expect(r.respaldo.nota.en).toMatch(/emergency/i);
    // El respaldo no trae un número "local" escondido.
    expect(JSON.stringify(r)).not.toMatch(/1111|1112|2221|3331/);
  });

  test('de un país con líneas a uno sin líneas: desaparecen las líneas anteriores', async () => {
    expect((await cambiarPais('AR')).tipo).toBe('pais');
    const r = await cambiarPais('PE');
    expect(r).toMatchObject({ tipo: 'respaldo', pais: 'PE' });
    expect(JSON.stringify(r)).not.toMatch(/1111|1112/);
  });

  test('sin país guardado ni región del teléfono → null → respaldo', () => {
    expect(paisInicial()).toBeNull();
    expect(ayudaParaPais(PROD, paisInicial()).tipo).toBe('respaldo');
  });

  test('en desarrollo PE (borrador) sí muestra sus líneas; en producción no', () => {
    expect(numerosMostrados(AYUDA, 'PE')).toEqual(['3331']);
    expect(numerosMostrados(PROD, 'PE')).toEqual([]);
  });
});
