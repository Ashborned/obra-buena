/**
 * Selección de la ayuda en salud mental según el país (CLAUDE.md, principio 6).
 *
 * - Si el país tiene líneas (ya filtradas por revisión), se muestran esas.
 * - Si no hay país o no hay datos para él: respaldo Find A Helpline + aviso de emergencias local.
 * - Nunca se devuelve el número de otro país.
 */
import type { Ayuda, AyudaPais, AyudaRespaldo, CodigoPais } from './tipos';

export type AyudaElegida =
  | { tipo: 'pais'; pais: AyudaPais; respaldo: AyudaRespaldo }
  | { tipo: 'respaldo'; pais: CodigoPais | null; respaldo: AyudaRespaldo };

/** Normaliza un código de país: "cl" → "CL"; cualquier cosa que no sea alfa-2 → null. */
export function normalizarPais(codigo: string | null | undefined): CodigoPais | null {
  if (!codigo) return null;
  const c = codigo.trim();
  // Validar antes de pasar a mayúsculas: 'ß'.toUpperCase() === 'SS'.
  return /^[A-Za-z]{2}$/.test(c) ? c.toUpperCase() : null;
}

export function ayudaParaPais(ayuda: Ayuda, codigo: string | null | undefined): AyudaElegida {
  const pais = normalizarPais(codigo);
  const datos = pais ? ayuda.paises.find((p) => p.pais === pais && p.lineas.length > 0) : undefined;
  return datos
    ? { tipo: 'pais', pais: datos, respaldo: ayuda.respaldo }
    : { tipo: 'respaldo', pais, respaldo: ayuda.respaldo };
}

/** Países con líneas disponibles (para el selector de "¿Estás en otro país?"). */
export function paisesConAyuda(ayuda: Ayuda): CodigoPais[] {
  return ayuda.paises.filter((p) => p.lineas.length > 0).map((p) => p.pais);
}
