/**
 * Rutas de Aprender. El lector, el quiz y la medalla grande viven fuera de las pestañas
 * (como el detalle de una novena): el lector es calma y no lleva la barra a la vista.
 * Las usan la pestaña Aprender, la vitrina y "Conocer su historia" del santo compañero en Emociones.
 */
import type { Href } from 'expo-router';

// Las rutas tipadas no aceptan patrones como `/lectura/${string}`; la forma la fijan estas funciones.

/** Lector de una lectura (`app/lectura/[id].tsx`). */
export function rutaLectura(id: string): Extract<Href, string> {
  return `/lectura/${id}` as Extract<Href, string>;
}

/** Quiz y resultado de una lectura (`app/quiz/[id].tsx`). */
export function rutaQuiz(id: string): Extract<Href, string> {
  return `/quiz/${id}` as Extract<Href, string>;
}

/** Medalla grande de la vitrina, que se gira con el dedo (`app/medalla/[id].tsx`). */
export function rutaMedalla(id: string): Extract<Href, string> {
  return `/medalla/${id}` as Extract<Href, string>;
}

/**
 * Medalla grande de una colección completa. Misma pantalla que la de una lectura, con `tipo`
 * para que el id de una colección nunca se confunda con el de una lectura.
 */
export function rutaMedallaColeccion(id: string): Extract<Href, string> {
  return `/medalla/${id}?tipo=coleccion` as Extract<Href, string>;
}
