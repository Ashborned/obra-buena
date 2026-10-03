/**
 * País de la persona a partir de la región del teléfono (expo-localization).
 * La app no pide permiso de ubicación (docs/decisiones.md, 2026-10-02).
 */
import { getLocales } from 'expo-localization';

import { normalizarPais } from '@/contenido/ayuda';

import { leerPais } from './preferencias';

/** Región del sistema (p. ej. "CL"), o null si el teléfono no la informa. */
export function paisDelSistema(): string | null {
  try {
    for (const l of getLocales()) {
      const pais = normalizarPais(l.regionCode);
      if (pais) return pais;
    }
  } catch {
    // Sin datos de región: la bienvenida pide elegir.
  }
  return null;
}

/** País efectivo: el elegido por la persona manda sobre la región del teléfono. */
export function paisInicial(): string | null {
  return leerPais() ?? paisDelSistema();
}
