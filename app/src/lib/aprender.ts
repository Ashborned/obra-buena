/**
 * Aprender: colecciones, lecturas, rasgos, quiz y medallas. Funciones puras sobre el contenido y
 * el progreso guardado (el progreso lo lee y escribe `progreso.ts`; la orquestación, `aprender-progreso.ts`).
 *
 * Principio 1: el juego vive solo aquí, y es de conocimiento. Sin rachas, sin temporizadores y sin
 * castigo por equivocarse: reprobar no borra nada y se puede reintentar de inmediato.
 *
 * Publicación (docs/decisiones.md, 2026-10-04 y 2026-10-05): toda lectura que está en `lecturas` se
 * publica; lo que está en `proximamente` se muestra como "Próximamente". No se filtra por `revision`.
 */
import type { CodigoPais, Coleccion, Contenido, Lectura, PreguntaQuiz, Proximamente } from '@/contenido/tipos';

// Colecciones ------------------------------------------------------------------------------------

export type ItemColeccion =
  | { tipo: 'lectura'; lectura: Lectura }
  | { tipo: 'proximamente'; item: Proximamente };

type ContenidoAprender = Pick<Contenido, 'lecturas' | 'proximamente' | 'colecciones'>;

export function lecturaPorId(c: Pick<Contenido, 'lecturas'>, id: string): Lectura | undefined {
  return c.lecturas.find((l) => l.id === id);
}

/** Ítems de la colección en su orden. Un id que no está ni en `lecturas` ni en `proximamente` se omite. */
export function itemsDeColeccion(c: ContenidoAprender, col: Coleccion): ItemColeccion[] {
  const items: ItemColeccion[] = [];
  for (const id of col.items) {
    const lectura = lecturaPorId(c, id);
    if (lectura) {
      items.push({ tipo: 'lectura', lectura });
      continue;
    }
    const item = c.proximamente.find((p) => p.id === id);
    if (item) items.push({ tipo: 'proximamente', item });
  }
  return items;
}

/** Lecturas publicadas de la colección. */
export function lecturasDeColeccion(c: ContenidoAprender, col: Coleccion): Lectura[] {
  return itemsDeColeccion(c, col).flatMap((x) => (x.tipo === 'lectura' ? [x.lectura] : []));
}

/**
 * Colecciones en orden para la pantalla: las del país de la persona primero (principio 8: lo regional
 * se muestra primero donde corresponde, pero no se esconde a los demás). Dentro de cada grupo,
 * el orden del contenido. Las colecciones sin ningún ítem conocido no se muestran.
 */
export function coleccionesOrdenadas(c: ContenidoAprender, pais?: CodigoPais | null): Coleccion[] {
  const visibles = c.colecciones.filter((col) => itemsDeColeccion(c, col).length > 0);
  if (!pais) return visibles;
  return [...visibles.filter((col) => col.pais === pais), ...visibles.filter((col) => col.pais !== pais)];
}

export type AvanceColeccion = {
  /** Lecturas publicadas con medalla. */
  conMedalla: number;
  /** Ítems de la colección, publicados y próximamente (el "1/4" de la maqueta). */
  total: number;
  /** Lecturas publicadas. */
  publicadas: number;
  /** Todas las lecturas publicadas tienen medalla (y hay al menos una). */
  completa: boolean;
};

export function avanceColeccion(
  c: ContenidoAprender,
  col: Coleccion,
  conMedalla: ReadonlySet<string>,
): AvanceColeccion {
  const items = itemsDeColeccion(c, col);
  const publicadas = items.flatMap((x) => (x.tipo === 'lectura' ? [x.lectura.id] : []));
  const ganadas = publicadas.filter((id) => conMedalla.has(id)).length;
  return {
    conMedalla: ganadas,
    total: items.length,
    publicadas: publicadas.length,
    completa: publicadas.length > 0 && ganadas === publicadas.length,
  };
}

/**
 * Colecciones de la lectura `lecturaId` que se completan con este conjunto de medallas y que aún no
 * tienen su medalla. Solo las de esa lectura: el resultado de un quiz no anuncia otra colección.
 * Una medalla de colección ya ganada se conserva aunque después se publique otra lectura en ella.
 */
export function coleccionesPorOtorgar(
  c: ContenidoAprender,
  lecturaId: string,
  conMedalla: ReadonlySet<string>,
  coleccionesGanadas: ReadonlySet<string>,
): string[] {
  return c.colecciones
    .filter((col) => col.items.includes(lecturaId))
    .filter((col) => !coleccionesGanadas.has(col.id) && avanceColeccion(c, col, conMedalla).completa)
    .map((col) => col.id);
}

// Rasgos ----------------------------------------------------------------------------------------

/** Rasgos descubiertos de la lectura, en el orden de `lectura.traits` (el primero es el principal). */
export function rasgosEnOrden(lectura: Lectura, descubiertos: readonly string[]): string[] {
  return lectura.traits.filter((r) => descubiertos.includes(r));
}

/** Índices de las secciones que descubren un rasgo de la lectura (en el idioma dado). */
export function seccionesConRasgo(lectura: Lectura, idioma: 'es' | 'en'): { seccion: number; rasgo: string }[] {
  return lectura[idioma].secs.flatMap((s, seccion) =>
    s.trait && lectura.traits.includes(s.trait) ? [{ seccion, rasgo: s.trait }] : [],
  );
}

// Quiz ------------------------------------------------------------------------------------------

/** Preguntas que tiene el quiz (la maqueta y el contenido: 5). */
export const PREGUNTAS_QUIZ = 5;

/** Estado del quiz: pregunta actual y respuesta elegida en cada una (`null` = sin responder). */
export type EstadoQuiz = { actual: number; respuestas: (number | null)[] };

export function iniciarQuiz(preguntas: readonly PreguntaQuiz[]): EstadoQuiz {
  return { actual: 0, respuestas: preguntas.map(() => null) };
}

/** Elige una alternativa de la pregunta actual. Una respuesta ya marcada no se cambia. */
export function elegir(estado: EstadoQuiz, preguntas: readonly PreguntaQuiz[], alternativa: number): EstadoQuiz {
  const p = preguntas[estado.actual];
  if (!p || estado.respuestas[estado.actual] !== null) return estado;
  if (!Number.isInteger(alternativa) || alternativa < 0 || alternativa >= p.o.length) return estado;
  const respuestas = [...estado.respuestas];
  respuestas[estado.actual] = alternativa;
  return { ...estado, respuestas };
}

/** Pasa a la siguiente pregunta (solo si la actual ya está respondida y no es la última). */
export function siguiente(estado: EstadoQuiz, preguntas: readonly PreguntaQuiz[]): EstadoQuiz {
  if (estado.respuestas[estado.actual] === null || esUltima(estado, preguntas)) return estado;
  return { ...estado, actual: estado.actual + 1 };
}

export function esUltima(estado: EstadoQuiz, preguntas: readonly PreguntaQuiz[]): boolean {
  return estado.actual >= preguntas.length - 1;
}

/** Todas las preguntas respondidas: se puede ver el resultado. */
export function quizTerminado(estado: EstadoQuiz): boolean {
  return estado.respuestas.length > 0 && estado.respuestas.every((r) => r !== null);
}

export function esCorrecta(pregunta: PreguntaQuiz, respuesta: number | null): boolean {
  return respuesta !== null && respuesta === pregunta.a;
}

export function puntaje(preguntas: readonly PreguntaQuiz[], respuestas: readonly (number | null)[]): number {
  return preguntas.reduce((n, p, i) => n + (esCorrecta(p, respuestas[i] ?? null) ? 1 : 0), 0);
}

/** Se aprueba con `lectura.pass` respuestas correctas (4 de 5). */
export function aprueba(lectura: Pick<Lectura, 'pass'>, aciertos: number): boolean {
  return aciertos >= lectura.pass;
}

// Vitrina ---------------------------------------------------------------------------------------

export type MedallaVitrina = { lectura: Lectura; ganadaEn: string | null };

/** Medallas de la vitrina: una por lectura publicada, en el orden de las colecciones. Las que faltan, `ganadaEn: null`. */
export function medallasVitrina(
  c: ContenidoAprender,
  ganadas: ReadonlyMap<string, string>,
  pais?: CodigoPais | null,
): MedallaVitrina[] {
  const vistas = new Set<string>();
  const orden: Lectura[] = [];
  for (const col of coleccionesOrdenadas(c, pais)) {
    for (const l of lecturasDeColeccion(c, col)) {
      if (!vistas.has(l.id)) orden.push(l);
      vistas.add(l.id);
    }
  }
  for (const l of c.lecturas) if (!vistas.has(l.id)) orden.push(l);
  return orden.map((lectura) => ({ lectura, ganadaEn: ganadas.get(lectura.id) ?? null }));
}

// Tamaño de letra del lector ---------------------------------------------------------------------

/** 15, 17, 19, 21, 23. Por defecto 17, el rol `lectura` del sistema de diseño. */
export const LETRA_LECTOR = { min: 15, max: 23, paso: 2, porDefecto: 17 } as const;

/** Tamaño de letra válido: un valor de la escala 15, 17, …, 23 (el más cercano; inválido → por defecto). */
export function acotarLetraLector(n: number): number {
  if (!Number.isFinite(n)) return LETRA_LECTOR.porDefecto;
  const { min, max, paso } = LETRA_LECTOR;
  const enEscala = Math.round((n - min) / paso) * paso + min;
  return Math.min(max, Math.max(min, enEscala));
}

export function cambiarLetraLector(actual: number, direccion: 1 | -1): number {
  return acotarLetraLector(actual + direccion * LETRA_LECTOR.paso);
}
