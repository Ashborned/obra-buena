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

  test('las 12 emociones se mantienen, aunque queden con items: []', () => {
    expect(r.emociones.map((e) => e.id)).toEqual(IDS);
    expect(r.emociones.filter((e) => e.items.length === 0)).toHaveLength(11);
    expect(r.emociones[3]).toMatchObject({ id: 'depression', care: 1, items: [] });
  });

  test('solo entradas aprobadas; borrador, pendiente y rechazado se quitan', () => {
    const todas = r.emociones.flatMap((e) => e.items);
    expect(todas.map((i) => i.c.es[0])).toEqual(['a1', 'a2']);
    expect(todas.every((i) => i.revision === 'aprobado')).toBe(true);
  });

  test('lecturas aprobadas se quedan; las demás se quitan', () => {
    expect(r.lecturas.map((l) => l.id)).toEqual(['lecA']);
  });

  test('rasgos: solo los usados por lecturas aprobadas', () => {
    expect(Object.keys(r.rasgos).sort()).toEqual(['t1', 't2']);
  });

  test('colecciones: solo ítems visibles; las vacías desaparecen', () => {
    expect(r.colecciones).toEqual([{ id: 'mixta', es: '', en: '', items: ['lecA'] }]);
  });

  test('novenas y proximamente sin aprobar se quitan', () => {
    expect(r.novenas).toEqual([]);
    expect(r.proximamente).toEqual([]);
  });

  test('novena aprobada se mantiene y el enlace c.nov a ella también', () => {
    const f = fixture();
    const x = filtrarPorRevision(
      fixture({ novenas: f.novenas.map((n) => ({ ...n, revision: 'aprobado' as Revision })) }),
      'produccion',
    );
    expect(x.novenas.map((n) => n.id)).toEqual(['nov1']);
    expect(x.emociones[0].items[0].c.nov).toBe('nov1');
  });

  test('santos_del_dia e historias_santos vacíos si revision_santos_del_dia no es aprobado', () => {
    expect(r.santos_del_dia).toEqual({});
    expect(r.historias_santos).toEqual({});
    for (const rev of ['pendiente', 'rechazado'] as Revision[]) {
      const x = filtrarPorRevision(fixture({ revision_santos_del_dia: rev }), 'produccion');
      expect(x.santos_del_dia).toEqual({});
      expect(x.historias_santos).toEqual({});
    }
  });

  test('santos_del_dia e historias_santos se mantienen con revision_santos_del_dia: aprobado', () => {
    const f = fixture({ revision_santos_del_dia: 'aprobado' });
    const x = filtrarPorRevision(f, 'produccion');
    expect(x.santos_del_dia).toEqual(f.santos_del_dia);
    expect(x.historias_santos).toEqual(f.historias_santos);
  });

  test('enlaces nov/lrn a algo no visible se quitan; lrn a lectura aprobada se mantiene', () => {
    const [a1, a2] = r.emociones[0].items;
    expect(a1.c.lrn).toBe('lecA');
    expect(a1.c).not.toHaveProperty('nov'); // nov1 está en borrador
    expect(a2.c).not.toHaveProperty('lrn'); // lecB está en borrador
    expect(a1.c).toMatchObject({ ini: 'X', es: ['a1', 'línea'], en: ['a1', 'line'] });
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
  const prod = filtrarPorRevision(real, 'produccion');

  test('desarrollo devuelve el JSON completo', () => {
    expect(filtrarPorRevision(real, 'desarrollo')).toEqual(copia);
  });

  test('producción no muta el JSON importado', () => {
    expect(real).toEqual(copia);
  });

  test('producción: todo lo que queda está aprobado y es coherente (válida cuando se apruebe contenido)', () => {
    expect(prod.emociones).toHaveLength(12);
    const entradas = prod.emociones.flatMap((e) => e.items);
    expect(entradas.every((i) => i.revision === 'aprobado')).toBe(true);
    expect(prod.lecturas.every((l) => l.revision === 'aprobado')).toBe(true);
    expect(prod.ayuda.paises.every((p) => p.revision === 'aprobado')).toBe(true);
    expect(prod.novenas.every((n) => n.revision === 'aprobado')).toBe(true);
    expect(prod.proximamente.every((x) => x.revision === 'aprobado')).toBe(true);

    const idsLect = new Set([...prod.lecturas.map((l) => l.id), ...prod.proximamente.map((x) => x.id)]);
    const idsNov = new Set(prod.novenas.map((n) => n.id));
    for (const i of entradas) {
      if (i.c.nov) expect(idsNov.has(i.c.nov)).toBe(true);
      if (i.c.lrn) expect(idsLect.has(i.c.lrn)).toBe(true);
    }
    for (const col of prod.colecciones) {
      expect(col.items.length).toBeGreaterThan(0);
      for (const id of col.items) expect(idsLect.has(id)).toBe(true);
    }
    const usados = new Set(prod.lecturas.flatMap((l) => l.traits));
    for (const k of Object.keys(prod.rasgos)) expect(usados.has(k)).toBe(true);

    if (real.revision_santos_del_dia !== 'aprobado') {
      expect(prod.santos_del_dia).toEqual({});
      expect(prod.historias_santos).toEqual({});
    }
    expect(prod.ayuda.respaldo).toEqual(real.ayuda.respaldo);
  });

  test('estado actual (2026-10-03, contenido aprobado por el cura de la comuna salvo las líneas de ayuda)', () => {
    // Si falla porque cambió el contenido, actualízala: la prueba anterior es la que importa.
    expect(prod.emociones.flatMap((e) => e.items)).toHaveLength(36);
    expect(prod.lecturas).toHaveLength(4);
    expect(prod.novenas).toHaveLength(6);
    expect(Object.keys(prod.santos_del_dia).length).toBeGreaterThan(0);
    // Líneas de ayuda: pendientes de verificar con fuente oficial (decisiones, pendiente 12).
    expect(prod.ayuda.paises).toHaveLength(0);
    expect(prod.ayuda.respaldo.url).toMatch(/^https:\/\/(www\.)?findahelpline\.com/);
  });
});
