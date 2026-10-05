/// <reference types="jest" />
import datos from '../../../../content/contenido.json';
import { filtrarPorRevision } from '../filtro';
import type {
  AyudaPais,
  Contenido,
  Emocion,
  EntradaEmocion,
  IdEmocion,
  Lectura,
  Revision,
} from '../tipos';

const IDS: IdEmocion[] = [
  'happy',
  'tired',
  'healing',
  'depression',
  'sad',
  'confused',
  'anger',
  'joy',
  'lonely',
  'love',
  'forgiveness',
  'gratitude',
];

function congelar<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) congelar(v);
  }
  return o;
}

function entrada(
  id: string,
  revision: Revision,
  c: Partial<EntradaEmocion['c']> = {},
): EntradaEmocion {
  return {
    ref: [`ref ${id}`, `ref ${id}`],
    v: [`v ${id}`, `v ${id}`],
    p: [`p ${id}`, `p ${id}`],
    c: { ini: 'X', es: [id, 'línea'], en: [id, 'line'], ...c },
    revision,
  };
}

function lectura(id: string, revision: Revision, traits: string[]): Lectura {
  const idioma = { name: id, sub: '', ring: '', secs: [{ h: 'h', ps: ['p'] }], quiz: [] };
  return {
    id,
    ini: 'L',
    lit: 'red',
    mins: 5,
    pass: 4,
    traits,
    fuentes: ['https://ejemplo'],
    revision,
    es: idioma,
    en: idioma,
  } as unknown as Lectura;
}

function pais(codigo: string, revision: Revision, lineas = 1): AyudaPais {
  return {
    pais: codigo,
    nombre: { es: codigo, en: codigo },
    lineas: Array.from({ length: lineas }, (_, i) => ({
      nombre: { es: `L${i}`, en: `L${i}` },
      numero: `${codigo}-${i}`,
      marcar: `${codigo}${i}`,
      detalle: { es: '', en: '' },
      fuente: 'https://ejemplo',
    })),
    verificado: '2026-10-02',
    revision,
  };
}

function fixture(over: Partial<Contenido> = {}): Contenido {
  const emociones: Emocion[] = IDS.map((id) => ({ id, es: id, en: id, items: [] }));
  emociones[0].items = [
    entrada('a1', 'aprobado', { nov: 'nov1', lrn: 'lecA' }),
    entrada('b1', 'borrador'),
    entrada('p1', 'pendiente'),
    entrada('r1', 'rechazado'),
    entrada('a2', 'aprobado', { lrn: 'lecB' }),
  ];
  emociones[3].care = 1;
  emociones[3].items = [entrada('dep-b', 'borrador')];
  return {
    version: 1,
    generado: '2026-10-03',
    traducciones: { es: 'RV1909', en: 'KJV' },
    emociones,
    lecturas: [
      lectura('lecA', 'aprobado', ['t1', 't2']),
      lectura('lecB', 'borrador', ['t3']),
      lectura('lecC', 'pendiente', ['t2', 't4']),
    ],
    proximamente: [{ id: 'prox1', ini: 'P', es: { name: '', sub: '' }, en: { name: '', sub: '' }, revision: 'borrador' }],
    colecciones: [
      { id: 'mixta', es: '', en: '', items: ['lecA', 'lecB', 'prox1'] },
      { id: 'vacia', es: '', en: '', items: ['lecB', 'lecC'] },
      { id: 'soloProx', pais: 'CL', es: '', en: '', items: ['prox1'] },
    ],
    rasgos: {
      t1: { es: ['1', ''], en: ['1', ''] },
      t2: { es: ['2', ''], en: ['2', ''] },
      t3: { es: ['3', ''], en: ['3', ''] },
      t4: { es: ['4', ''], en: ['4', ''] },
    },
    santos_del_dia: { '10-04': { ini: 'F', es: ['a', 'b', 'c'], en: ['a', 'b', 'c'] } },
    historias_santos: {
      '10-04': {
        es: { f: [], st: [], q: '', qr: '', pr: '' },
        en: { f: [], st: [], q: '', qr: '', pr: '' },
      },
    },
    novenas: [{ id: 'nov1', es: '', en: '', ini: 'N', m: 10, d: 4, revision: 'borrador' }],
    revision_santos_del_dia: 'borrador',
    ayuda: {
      respaldo: {
        nombre: { es: 'FAH', en: 'FAH' },
        url: 'https://findahelpline.com',
        nota: { es: 'emergencias', en: 'emergency' },
        fuente: 'https://findahelpline.com/about',
      },
      paises: [
        pais('CL', 'aprobado', 2),
        pais('US', 'borrador'),
        pais('ES', 'pendiente'),
        pais('MX', 'rechazado'),
      ],
    },
    ...over,
  } as Contenido;
}

describe('filtrarPorRevision: desarrollo', () => {
  test('devuelve todo igual (misma referencia)', () => {
    const c = fixture();
    const r = filtrarPorRevision(c, 'desarrollo');
    expect(r).toBe(c);
    expect(r).toEqual(fixture());
  });
});

describe('filtrarPorRevision: producción', () => {
  // Fixture congelado en profundidad: si el filtro mutara la entrada, lanzaría (módulos en modo estricto).
  const entradaCongelada = congelar(fixture());
  const r = filtrarPorRevision(entradaCongelada, 'produccion');

  test('no muta la entrada', () => {
    expect(entradaCongelada).toEqual(fixture());
  });

  test('sin paso de aprobación: emociones, lecturas, novenas, santos y colecciones pasan tal cual', () => {
    const f = fixture();
    expect(r.emociones).toEqual(f.emociones);
    expect(r.lecturas).toEqual(f.lecturas);
    expect(r.novenas).toEqual(f.novenas);
    expect(r.proximamente).toEqual(f.proximamente);
    expect(r.colecciones).toEqual(f.colecciones);
    expect(r.rasgos).toEqual(f.rasgos);
    expect(r.santos_del_dia).toEqual(f.santos_del_dia);
    expect(r.historias_santos).toEqual(f.historias_santos);
  });

  test('el evangelio de ejemplo no se publica', () => {
    const x = filtrarPorRevision(
      fixture({ evangelio_ejemplo: { ref: ['a', 'b'], t: ['a', 'b'], revision: 'borrador' } }),
      'produccion',
    );
    expect(x.evangelio_ejemplo).toBeUndefined();
  });

  test('ayuda: solo países aprobados; respaldo intacto', () => {
    expect(r.ayuda.paises.map((p) => p.pais)).toEqual(['CL']);
    expect(r.ayuda.respaldo).toEqual(fixture().ayuda.respaldo);
  });

  test('ayuda.respaldo se mantiene aunque no haya ningún país aprobado', () => {
    const f = fixture();
    const sinAprobados = fixture({
      ayuda: {
        respaldo: f.ayuda.respaldo,
        paises: f.ayuda.paises.map((p) => ({ ...p, revision: 'borrador' as Revision })),
      },
    });
    const x = filtrarPorRevision(sinAprobados, 'produccion');
    expect(x.ayuda.paises).toEqual([]);
    expect(x.ayuda.respaldo).toEqual(f.ayuda.respaldo);

    const vacio = filtrarPorRevision(
      fixture({ ayuda: { respaldo: f.ayuda.respaldo, paises: [] } }),
      'produccion',
    );
    expect(vacio.ayuda.respaldo.url).toBe('https://findahelpline.com');
  });

  test('conserva los campos generales', () => {
    expect(r.version).toBe(1);
    expect(r.traducciones).toEqual({ es: 'RV1909', en: 'KJV' });
  });
});

describe('filtrarPorRevision con el JSON real', () => {
  const real = datos as unknown as Contenido;
  const copia = JSON.parse(JSON.stringify(datos));

  test('desarrollo devuelve el JSON completo', () => {
    expect(filtrarPorRevision(real, 'desarrollo')).toEqual(copia);
  });

  test('producción no muta el JSON importado', () => {
    expect(real).toEqual(copia);
  });

  test('producción: todo el contenido pasa salvo números de ayuda sin verificar y el evangelio de ejemplo', () => {
    const prod = filtrarPorRevision(real, 'produccion');
    expect(prod.emociones).toEqual(real.emociones);
    expect(prod.lecturas).toEqual(real.lecturas);
    expect(prod.novenas).toEqual(real.novenas);
    expect(prod.santos_del_dia).toEqual(real.santos_del_dia);
    expect(prod.ayuda.paises.every((p) => p.revision === 'aprobado')).toBe(true);
    expect(prod.ayuda.respaldo).toEqual(real.ayuda.respaldo);
    expect(prod.evangelio_ejemplo).toBeUndefined();
  });
});
