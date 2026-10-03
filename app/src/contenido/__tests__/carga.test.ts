/// <reference types="jest" />
/*
 * Carga de `content/contenido.json` en tiempo de ejecución.
 * Complementa `scripts/validar-contenido.mjs`: `index.ts` usa `as unknown as Contenido`,
 * así que TypeScript no comprueba la forma del JSON.
 */
import datos from '../../../../content/contenido.json';

type Cualquiera = any;
const crudo = datos as Cualquiera;

const IDS_EMOCIONES = [
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
const REVISIONES = ['borrador', 'pendiente', 'aprobado', 'rechazado'];

const esParNoVacio = (x: unknown) =>
  Array.isArray(x) &&
  x.length === 2 &&
  x.every((s) => typeof s === 'string' && s.trim().length > 0);

describe('contenido.json: forma esencial', () => {
  test('12 emociones con los ids del esquema, sin repetir', () => {
    const ids = crudo.emociones.map((e: Cualquiera) => e.id);
    expect(ids).toHaveLength(12);
    expect([...ids].sort()).toEqual([...IDS_EMOCIONES].sort());
  });

  test('cada entrada de emoción: ref, v, p como [es, en] no vacíos y revision válida', () => {
    const malas: string[] = [];
    for (const e of crudo.emociones) {
      expect(typeof e.es).toBe('string');
      expect(typeof e.en).toBe('string');
      expect(Array.isArray(e.items)).toBe(true);
      e.items.forEach((it: Cualquiera, i: number) => {
        for (const k of ['ref', 'v', 'p']) if (!esParNoVacio(it[k])) malas.push(`${e.id}[${i}].${k}`);
        if (!REVISIONES.includes(it.revision)) malas.push(`${e.id}[${i}].revision=${it.revision}`);
        if (!it.c || !esParNoVacio(it.c.es) || !esParNoVacio(it.c.en))
          malas.push(`${e.id}[${i}].c`);
      });
    }
    expect(malas).toEqual([]);
  });

  test('Depresión, Triste y Soledad tienen care: 1 (tarjeta de ayuda)', () => {
    for (const id of ['depression', 'sad', 'lonely']) {
      expect(crudo.emociones.find((e: Cualquiera) => e.id === id).care).toBe(1);
    }
  });

  test('lecturas: es/en con el mismo número de secciones y preguntas y la misma respuesta correcta', () => {
    expect(crudo.lecturas.length).toBeGreaterThan(0);
    for (const l of crudo.lecturas) {
      expect(REVISIONES).toContain(l.revision);
      expect(Array.isArray(l.fuentes) && l.fuentes.length).toBeTruthy();
      expect(l.es.secs.length).toBeGreaterThan(0);
      expect(l.en.secs.length).toBe(l.es.secs.length);
      expect(l.en.quiz.length).toBe(l.es.quiz.length);
      l.es.quiz.forEach((q: Cualquiera, i: number) => {
        const qen = l.en.quiz[i];
        expect({ id: l.id, i, a: qen.a }).toEqual({ id: l.id, i, a: q.a });
        expect(q.o.length).toBe(qen.o.length);
        expect(q.a).toBeGreaterThanOrEqual(0);
        expect(q.a).toBeLessThan(q.o.length);
      });
      // Los rasgos de cada sección deben existir en `rasgos`.
      for (const t of l.traits) expect(crudo.rasgos).toHaveProperty(t);
    }
  });

  test('ayuda.respaldo tiene url https y nota es/en', () => {
    const r = crudo.ayuda.respaldo;
    expect(r.url).toMatch(/^https:\/\//);
    expect(new URL(r.url).hostname).toMatch(/(^|\.)findahelpline\.com$/);
    expect(r.nota.es.trim()).not.toBe('');
    expect(r.nota.en.trim()).not.toBe('');
  });

  test('cada país de ayuda: código alfa-2 en mayúsculas, sin repetir, revision válida', () => {
    const codigos = crudo.ayuda.paises.map((p: Cualquiera) => p.pais);
    for (const c of codigos) expect(c).toMatch(/^[A-Z]{2}$/);
    expect(new Set(codigos).size).toBe(codigos.length);
    for (const p of crudo.ayuda.paises) {
      expect(REVISIONES).toContain(p.revision);
      for (const l of p.lineas) {
        expect(typeof l.marcar).toBe('string');
        expect(l.marcar).not.toMatch(/\s/);
        expect(l.fuente).toMatch(/^https?:\/\//);
      }
    }
  });
});

describe('@/contenido: carga local', () => {
  afterEach(() => jest.restoreAllMocks());

  test('importar el módulo no llama a fetch', () => {
    const original = globalThis.fetch;
    const espia = jest.fn(() => Promise.reject(new Error('sin red')));
    (globalThis as Cualquiera).fetch = espia;
    try {
      jest.isolateModules(() => {
        require('@/contenido');
      });
      expect(espia).not.toHaveBeenCalled();
    } finally {
      (globalThis as Cualquiera).fetch = original;
    }
  });

  test('en Jest __DEV__ es true: modo desarrollo y contenido igual al JSON completo', () => {
    expect(__DEV__).toBe(true);
    const m = require('@/contenido');
    expect(m.MODO_CONTENIDO).toBe('desarrollo');
    expect(m.contenido).toEqual(datos);
  });
});
