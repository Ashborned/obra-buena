/// <reference types="jest" />
/*
 * Aprender (lógica pura): colecciones, rasgos, quiz, vitrina y tamaño de letra del lector,
 * más la coherencia es/en del contenido real de `lecturas`.
 *
 * Principio 1 (CLAUDE.md): el juego vive solo en Aprender y es de conocimiento: sin rachas,
 * sin temporizadores y sin castigo por equivocarse.
 * Publicación (docs/decisiones.md, 2026-10-04): no se filtra por `revision`.
 *
 * La parte que toca la base (registrarResultadoQuiz, rasgos, medallas de colección) está en
 * progreso.test.ts, que tiene el doble de SQLite en memoria.
 */
import datos from '../../../../content/contenido.json';
import { filtrarPorRevision } from '@/contenido/filtro';
import type { Coleccion, Contenido, Lectura, PreguntaQuiz } from '@/contenido/tipos';

import {
  acotarLetraLector,
  aprueba,
  avanceColeccion,
  cambiarLetraLector,
  coleccionesOrdenadas,
  coleccionesPorOtorgar,
  elegir,
  esCorrecta,
  esUltima,
  iniciarQuiz,
  itemsDeColeccion,
  LETRA_LECTOR,
  lecturaPorId,
  lecturasDeColeccion,
  medallasVitrina,
  PREGUNTAS_QUIZ,
  puntaje,
  quizTerminado,
  rasgosEnOrden,
  seccionesConRasgo,
  siguiente,
  type EstadoQuiz,
} from '../aprender';

// Sin @types/node en el proyecto (misma convención que otra-oracion.test.ts).
declare const __dirname: string;
const fs = require('fs') as { readFileSync(f: string, enc: 'utf8'): string };
const path = require('path') as { resolve(...p: string[]): string };

const real = datos as unknown as Contenido;
const col = (id: string) => real.colecciones.find((c) => c.id === id)!;
const lec = (id: string) => lecturaPorId(real, id)!;

// Quiz de prueba: 5 preguntas, 4 alternativas, respuestas correctas 0,1,2,3,0.
const CORRECTAS = [0, 1, 2, 3, 0];
const PREGUNTAS: PreguntaQuiz[] = CORRECTAS.map((a, i) => ({ q: `p${i}`, o: ['A', 'B', 'C', 'D'], a, e: '' }));
const mal = (a: number) => (a + 1) % 4;

/** Responde todo el quiz con `respuestas`, como lo haría la pantalla (elegir → siguiente). */
function responder(preguntas: PreguntaQuiz[], respuestas: number[]): EstadoQuiz {
  let e = iniciarQuiz(preguntas);
  respuestas.forEach((r, i) => {
    e = elegir(e, preguntas, r);
    if (i < respuestas.length - 1) e = siguiente(e, preguntas);
  });
  return e;
}

// -------------------------------------------------------------------------------------------------

describe('publicación: no se filtra por revisión (decisión 2026-10-04)', () => {
  const prod = filtrarPorRevision(real, 'produccion');

  test('en producción quedan todas las lecturas, proximamente y colecciones', () => {
    expect(prod.lecturas).toEqual(real.lecturas);
    expect(prod.proximamente).toEqual(real.proximamente);
    expect(prod.colecciones).toEqual(real.colecciones);
    expect(prod.rasgos).toEqual(real.rasgos);
  });

  test('una lectura en borrador sigue publicada en producción', () => {
    const borrador = { ...real.lecturas[0], id: 'borrador-x', revision: 'borrador' } as Lectura;
    const c = filtrarPorRevision({ ...real, lecturas: [...real.lecturas, borrador] }, 'produccion');
    expect(c.lecturas.map((l) => l.id)).toContain('borrador-x');
    const conCol = { ...c, colecciones: [{ id: 'x', es: 'x', en: 'x', items: ['borrador-x'] }] };
    expect(lecturasDeColeccion(conCol, conCol.colecciones[0]).map((l) => l.id)).toEqual(['borrador-x']);
  });
});

// -------------------------------------------------------------------------------------------------

describe('colecciones', () => {
  test('"apo" con el contenido real: 4 ítems, 2 publicados (pablo, pedro) y 2 próximamente', () => {
    const items = itemsDeColeccion(real, col('apo'));
    expect(items).toHaveLength(4);
    expect(items.map((x) => x.tipo)).toEqual(['lectura', 'lectura', 'proximamente', 'proximamente']);
    expect(lecturasDeColeccion(real, col('apo')).map((l) => l.id)).toEqual(['pablo', 'pedro']);
  });

  test('un id que no está en lecturas ni en proximamente se omite', () => {
    const c: Coleccion = { id: 'x', es: 'x', en: 'x', items: ['pablo', 'no-existe', 'andres'] };
    expect(itemsDeColeccion(real, c).map((x) => (x.tipo === 'lectura' ? x.lectura.id : x.item.id))).toEqual([
      'pablo',
      'andres',
    ]);
  });

  test('sin país: orden del contenido', () => {
    expect(coleccionesOrdenadas(real).map((c) => c.id)).toEqual(real.colecciones.map((c) => c.id));
    expect(coleccionesOrdenadas(real, null).map((c) => c.id)).toEqual(real.colecciones.map((c) => c.id));
  });

  test('país primero (CL → "chile" arriba), sin esconder las demás; otro país no cambia el orden', () => {
    const cl = coleccionesOrdenadas(real, 'CL').map((c) => c.id);
    expect(cl[0]).toBe('chile');
    expect([...cl].sort()).toEqual(real.colecciones.map((c) => c.id).sort());
    expect(coleccionesOrdenadas(real, 'US').map((c) => c.id)).toEqual(real.colecciones.map((c) => c.id));
  });

  test('una colección sin ningún ítem conocido no se muestra', () => {
    const c = { ...real, colecciones: [...real.colecciones, { id: 'vacia', es: 'v', en: 'v', items: ['nada'] }] };
    expect(coleccionesOrdenadas(c).map((x) => x.id)).not.toContain('vacia');
  });
});

describe('avance y medalla de colección', () => {
  test('"apo" sin medallas → 0/4', () => {
    expect(avanceColeccion(real, col('apo'), new Set())).toEqual({
      conMedalla: 0,
      total: 4,
      publicadas: 2,
      completa: false,
    });
  });

  test('"apo" con una medalla → 1/4, no completa', () => {
    const a = avanceColeccion(real, col('apo'), new Set(['pablo']));
    expect([a.conMedalla, a.total, a.completa]).toEqual([1, 4, false]);
  });

  test('"apo" con las dos publicadas → completa (aunque haya próximamente)', () => {
    const a = avanceColeccion(real, col('apo'), new Set(['pablo', 'pedro']));
    expect([a.conMedalla, a.total, a.publicadas, a.completa]).toEqual([2, 4, 2, true]);
  });

  test('medallas de lecturas de otra colección no cuentan', () => {
    expect(avanceColeccion(real, col('apo'), new Set(['teresa', 'hurtado'])).conMedalla).toBe(0);
  });

  test('colección sin lecturas publicadas ("maria") nunca se completa', () => {
    const todas = new Set(real.lecturas.map((l) => l.id));
    expect(lecturasDeColeccion(real, col('maria'))).toHaveLength(0);
    expect(avanceColeccion(real, col('maria'), todas).completa).toBe(false);
    for (const l of real.lecturas) expect(coleccionesPorOtorgar(real, l.id, todas, new Set())).not.toContain('maria');
  });

  test('coleccionesPorOtorgar: solo las completas de esa lectura que aún no se ganaron', () => {
    expect(coleccionesPorOtorgar(real, 'pablo', new Set(['pablo']), new Set())).toEqual([]);
    expect(coleccionesPorOtorgar(real, 'pedro', new Set(['pablo', 'pedro']), new Set())).toEqual(['apo']);
    expect(coleccionesPorOtorgar(real, 'pedro', new Set(['pablo', 'pedro']), new Set(['apo']))).toEqual([]);
    const todas = new Set(real.lecturas.map((l) => l.id));
    expect(coleccionesPorOtorgar(real, 'hurtado', todas, new Set())).toEqual(['chile']);
  });

  test('coleccionesPorOtorgar no anuncia una colección ajena a la lectura del quiz', () => {
    expect(coleccionesPorOtorgar(real, 'teresa', new Set(['pablo', 'pedro', 'teresa']), new Set())).toEqual([]);
  });

  test('una medalla de colección ya ganada se conserva aunque se publique otra lectura en ella', () => {
    const nueva = { ...lec('pablo'), id: 'andres' } as Lectura;
    const c = { ...real, lecturas: [...real.lecturas, nueva] };
    const conMedalla = new Set(['pablo', 'pedro']);
    expect(avanceColeccion(c, col('apo'), conMedalla).completa).toBe(false);
    // La pura no la quita ni la vuelve a otorgar: el registro de `apo` sigue en `ganadas`.
    expect(coleccionesPorOtorgar(c, 'pedro', conMedalla, new Set(['apo']))).toEqual([]);
  });
});

// -------------------------------------------------------------------------------------------------

describe('rasgos', () => {
  test('rasgosEnOrden sigue el orden de lectura.traits, no el de descubrimiento', () => {
    expect(rasgosEnOrden(lec('pablo'), ['sword', 'light'])).toEqual(['light', 'sword']);
    expect(rasgosEnOrden(lec('pablo'), [])).toEqual([]);
    expect(rasgosEnOrden(lec('pablo'), ['keys', 'book'])).toEqual(['book']);
  });

  test.each(real.lecturas.map((l) => [l.id, l] as const))(
    'seccionesConRasgo (%s): los 3 rasgos, mismas secciones en es y en',
    (_id, l) => {
      const es = seccionesConRasgo(l, 'es');
      expect(es).toEqual(seccionesConRasgo(l, 'en'));
      expect(es.map((x) => x.rasgo).sort()).toEqual([...l.traits].sort());
    },
  );
});

// -------------------------------------------------------------------------------------------------

describe('quiz: estado', () => {
  test('inicia en la primera pregunta, sin respuestas', () => {
    expect(iniciarQuiz(PREGUNTAS)).toEqual({ actual: 0, respuestas: [null, null, null, null, null] });
  });

  test('elegir marca la pregunta actual y no muta el estado anterior', () => {
    const e0 = iniciarQuiz(PREGUNTAS);
    const e1 = elegir(e0, PREGUNTAS, 2);
    expect(e1.respuestas[0]).toBe(2);
    expect(e0.respuestas[0]).toBeNull();
  });

  test('elegir no cambia una respuesta ya marcada', () => {
    const e1 = elegir(iniciarQuiz(PREGUNTAS), PREGUNTAS, 2);
    expect(elegir(e1, PREGUNTAS, 0)).toBe(e1);
    expect(e1.respuestas[0]).toBe(2);
  });

  test.each([-1, 4, 1.5, NaN, Infinity])('elegir ignora el índice inválido %p', (i) => {
    const e0 = iniciarQuiz(PREGUNTAS);
    expect(elegir(e0, PREGUNTAS, i)).toBe(e0);
  });

  test('siguiente no avanza sin respuesta', () => {
    const e0 = iniciarQuiz(PREGUNTAS);
    expect(siguiente(e0, PREGUNTAS)).toBe(e0);
  });

  test('siguiente avanza de una en una y no pasa de la última', () => {
    let e = iniciarQuiz(PREGUNTAS);
    for (let i = 0; i < PREGUNTAS.length; i++) {
      expect(e.actual).toBe(i);
      expect(esUltima(e, PREGUNTAS)).toBe(i === PREGUNTAS.length - 1);
      e = siguiente(elegir(e, PREGUNTAS, 0), PREGUNTAS);
    }
    expect(e.actual).toBe(PREGUNTAS.length - 1);
    expect(siguiente(e, PREGUNTAS)).toBe(e);
  });

  test('quizTerminado solo con todas respondidas (y nunca con un quiz vacío)', () => {
    expect(quizTerminado(iniciarQuiz(PREGUNTAS))).toBe(false);
    expect(quizTerminado(responder(PREGUNTAS, [0, 0, 0, 0]))).toBe(false);
    expect(quizTerminado(responder(PREGUNTAS, [0, 0, 0, 0, 0]))).toBe(true);
    expect(quizTerminado(iniciarQuiz([]))).toBe(false);
  });

  test('no hay tiempo en el estado del quiz (principio 1: sin temporizador)', () => {
    expect(Object.keys(responder(PREGUNTAS, CORRECTAS)).sort()).toEqual(['actual', 'respuestas']);
  });
});

describe('quiz: puntaje y umbral', () => {
  const lectura = { pass: 4 };

  test('5/5 aprueba', () => {
    const e = responder(PREGUNTAS, CORRECTAS);
    expect(puntaje(PREGUNTAS, e.respuestas)).toBe(5);
    expect(aprueba(lectura, 5)).toBe(true);
  });

  test('4/5 aprueba', () => {
    const e = responder(PREGUNTAS, [...CORRECTAS.slice(0, 4), mal(CORRECTAS[4])]);
    expect(puntaje(PREGUNTAS, e.respuestas)).toBe(4);
    expect(aprueba(lectura, 4)).toBe(true);
  });

  test('3/5 no aprueba', () => {
    const e = responder(PREGUNTAS, CORRECTAS.map((a, i) => (i < 3 ? a : mal(a))));
    expect(puntaje(PREGUNTAS, e.respuestas)).toBe(3);
    expect(aprueba(lectura, 3)).toBe(false);
  });

  test('el umbral es lectura.pass', () => {
    expect(aprueba({ pass: 3 }, 3)).toBe(true);
    expect(aprueba({ pass: 5 }, 4)).toBe(false);
    for (const l of real.lecturas) expect(l.pass).toBe(4);
  });

  test('respuestas null (o faltantes) cuentan como error', () => {
    expect(puntaje(PREGUNTAS, [null, null, null, null, null])).toBe(0);
    expect(puntaje(PREGUNTAS, [0, 1, null, 3, null])).toBe(3);
    expect(puntaje(PREGUNTAS, [0, 1])).toBe(2);
    expect(esCorrecta(PREGUNTAS[0], null)).toBe(false);
    expect(esCorrecta(PREGUNTAS[0], 0)).toBe(true);
  });

  test('con el contenido real: responder `a` en todo da 5/5 en es y en', () => {
    for (const l of real.lecturas) {
      for (const idioma of ['es', 'en'] as const) {
        const q = l[idioma].quiz;
        expect(puntaje(q, responder(q, q.map((p) => p.a)).respuestas)).toBe(PREGUNTAS_QUIZ);
      }
    }
  });
});

// -------------------------------------------------------------------------------------------------

describe('contenido real de lecturas: es y en coinciden', () => {
  test.each(real.lecturas.map((l) => [l.id, l] as const))('%s', (_id, l) => {
    // Quiz: 5 preguntas, 4 alternativas, misma respuesta correcta en es y en, dentro de rango.
    expect(l.es.quiz).toHaveLength(PREGUNTAS_QUIZ);
    expect(l.en.quiz).toHaveLength(PREGUNTAS_QUIZ);
    l.es.quiz.forEach((p, i) => {
      const en = l.en.quiz[i];
      expect(p.o).toHaveLength(4);
      expect(en.o).toHaveLength(4);
      expect(en.a).toBe(p.a);
      expect(Number.isInteger(p.a) && p.a >= 0 && p.a < p.o.length).toBe(true);
    });

    // Secciones: mismo número y mismo trait en la misma posición.
    expect(l.en.secs).toHaveLength(l.es.secs.length);
    expect(l.en.secs.map((s) => s.trait ?? null)).toEqual(l.es.secs.map((s) => s.trait ?? null));

    // Cada trait de sección está en lectura.traits y en rasgos; cada rasgo en una sola sección.
    const deSecciones = l.es.secs.flatMap((s) => (s.trait ? [s.trait] : []));
    for (const t of deSecciones) {
      expect(l.traits).toContain(t);
      expect(real.rasgos).toHaveProperty(t);
    }
    for (const t of l.traits) expect(deSecciones.filter((x) => x === t)).toHaveLength(1);

    // Los 3 traits existen en rasgos con [nombre, línea] en es y en.
    expect(l.traits).toHaveLength(3);
    expect(new Set(l.traits).size).toBe(3);
    for (const t of l.traits) {
      for (const idioma of ['es', 'en'] as const) {
        const par = real.rasgos[t]?.[idioma];
        expect(par).toHaveLength(2);
        expect(par.every((x) => typeof x === 'string' && x.trim().length > 0)).toBe(true);
      }
    }
  });
});

// -------------------------------------------------------------------------------------------------

describe('vitrina', () => {
  test('una medalla por lectura publicada, en el orden de las colecciones; las que faltan en null', () => {
    const v = medallasVitrina(real, new Map([['pedro', '2026-10-05T12:00:00.000Z']]));
    expect(v.map((m) => m.lectura.id)).toEqual(['pablo', 'pedro', 'teresa', 'hurtado']);
    expect(v.map((m) => m.ganadaEn)).toEqual([null, '2026-10-05T12:00:00.000Z', null, null]);
  });

  test('con país CL, las de Chile primero', () => {
    expect(medallasVitrina(real, new Map(), 'CL').map((m) => m.lectura.id)).toEqual([
      'teresa',
      'hurtado',
      'pablo',
      'pedro',
    ]);
  });

  test('una lectura en dos colecciones aparece una vez; una sin colección, al final', () => {
    const suelta = { ...lec('pablo'), id: 'suelta' } as Lectura;
    const c = {
      ...real,
      lecturas: [...real.lecturas, suelta],
      colecciones: [...real.colecciones, { id: 'dup', es: 'd', en: 'd', items: ['pablo'] }],
    };
    const ids = medallasVitrina(c, new Map()).map((m) => m.lectura.id);
    expect(ids).toEqual(['pablo', 'pedro', 'teresa', 'hurtado', 'suelta']);
  });
});

// -------------------------------------------------------------------------------------------------

describe('tamaño de letra del lector (puro)', () => {
  test('15–23, paso 2, por defecto 17', () => {
    expect(LETRA_LECTOR).toEqual({ min: 15, max: 23, paso: 2, porDefecto: 17 });
  });

  test('desde el defecto, los pasos recorren 15, 17, 19, 21, 23 y se detienen en los bordes', () => {
    let n: number = LETRA_LECTOR.porDefecto;
    const subiendo = [];
    for (let i = 0; i < 5; i++) subiendo.push((n = cambiarLetraLector(n, 1)));
    expect(subiendo).toEqual([19, 21, 23, 23, 23]);
    const bajando = [];
    for (let i = 0; i < 6; i++) bajando.push((n = cambiarLetraLector(n, -1)));
    expect(bajando).toEqual([21, 19, 17, 15, 15, 15]);
  });

  test('acotar: fuera de rango se acota, no finito → por defecto', () => {
    expect(acotarLetraLector(10)).toBe(15);
    expect(acotarLetraLector(99)).toBe(23);
    expect(acotarLetraLector(19)).toBe(19);
    expect(acotarLetraLector(NaN)).toBe(17);
    expect(acotarLetraLector(Infinity)).toBe(17);
    expect(acotarLetraLector(-Infinity)).toBe(17);
  });

  // Un valor par o decimal guardado se lleva al más cercano de la escala (no se arrastra en A−/A+).
  test('acotar deja el valor en la escala de 15, 17, 19, 21, 23', () => {
    for (const n of [16, 18, 20, 22, 17.6]) {
      expect([15, 17, 19, 21, 23]).toContain(acotarLetraLector(n));
    }
  });
});

// -------------------------------------------------------------------------------------------------

describe('principio 1: sin temporizadores ni rachas en la lógica de Aprender', () => {
  const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const archivos = ['../aprender.ts', '../aprender-progreso.ts', '../progreso.ts'];

  test.each(archivos)('%s no tiene temporizadores, rachas ni contadores', (f) => {
    const codigo = sinComentarios(fs.readFileSync(path.resolve(__dirname, f), 'utf8'));
    expect(codigo).not.toMatch(
      /setTimeout|setInterval|requestAnimationFrame|Date\.now|performance\.now|temporizador|timer|countdown|cuenta_?regresiva|segundos|tiempo_?limite|racha|streak|combo|vidas|lives|nivel|level|xp\b|contador/i,
    );
  });

  test('el quiz no castiga: aprender.ts no resta puntaje', () => {
    const codigo = sinComentarios(fs.readFileSync(path.resolve(__dirname, '../aprender.ts'), 'utf8'));
    expect(codigo).not.toMatch(/n\s*-\s*1|penaliz|castig|descontar/i);
  });
});
