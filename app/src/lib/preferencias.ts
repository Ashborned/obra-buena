/**
 * Preferencias guardadas en el teléfono (paleta, hora de oración, idioma, país, bienvenida) con `expo-sqlite/kv-store`
 * (docs/decisiones.md, 2026-10-03: almacenamiento local con expo-sqlite).
 *
 * - La lectura es síncrona para que el tema arranque ya con la paleta guardada (sin parpadeo).
 * - Si la lectura falla o el valor guardado no es válido, se usa el valor por defecto.
 * - La escritura es asíncrona y nunca rompe la interfaz: si falla, la preferencia sigue en memoria.
 *
 * Nada de esto sale del teléfono.
 */
import Storage from 'expo-sqlite/kv-store';

import { PALETA_POR_DEFECTO, PALETAS_IDS, type PaletaId } from '@/theme/paletas';

import type { PreferenciaHora } from './hora-oracion';

const CLAVES = {
  paleta: 'preferencias.paleta',
  hora: 'preferencias.hora',
  idioma: 'preferencias.idioma',
  pais: 'preferencias.pais',
  bienvenida: 'preferencias.bienvenida',
  aperturaVitral: 'preferencias.aperturaVitral',
} as const;

const PREFERENCIAS_HORA: readonly PreferenciaHora[] = ['auto', 'day', 'dusk', 'night'];

export const PREFERENCIA_HORA_POR_DEFECTO: PreferenciaHora = 'auto';

function leer<T extends string>(clave: string, validos: readonly T[], porDefecto: T): T {
  try {
    const valor = Storage.getItemSync(clave);
    return valor !== null && (validos as readonly string[]).includes(valor) ? (valor as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function guardar(clave: string, valor: string): void {
  try {
    Storage.setItemAsync(clave, valor).catch(() => {
      // Sin almacenamiento disponible: la preferencia vale para esta sesión.
    });
  } catch {
    // Igual que arriba: nunca se interrumpe la interfaz por no poder guardar.
  }
}

export function leerPaleta(): PaletaId {
  return leer(CLAVES.paleta, PALETAS_IDS, PALETA_POR_DEFECTO);
}

export function guardarPaleta(id: PaletaId): void {
  guardar(CLAVES.paleta, id);
}

export function leerPreferenciaHora(): PreferenciaHora {
  return leer(CLAVES.hora, PREFERENCIAS_HORA, PREFERENCIA_HORA_POR_DEFECTO);
}

export function guardarPreferenciaHora(pref: PreferenciaHora): void {
  guardar(CLAVES.hora, pref);
}

/**
 * Idioma elegido por la persona, o `null` si nunca eligió uno (entonces manda el del teléfono).
 * Recibe la lista de idiomas válidos para no depender de i18n (evita una importación circular).
 */
export function leerIdioma<T extends string>(validos: readonly T[]): T | null {
  try {
    const valor = Storage.getItemSync(CLAVES.idioma);
    return valor !== null && (validos as readonly string[]).includes(valor) ? (valor as T) : null;
  } catch {
    return null;
  }
}

export function guardarIdioma(idioma: string): void {
  guardar(CLAVES.idioma, idioma);
}

/** País elegido (ISO alfa-2), o `null` si nunca se eligió (entonces manda la región del teléfono). */
export function leerPais(): string | null {
  try {
    const valor = Storage.getItemSync(CLAVES.pais);
    return valor !== null && /^[A-Z]{2}$/.test(valor) ? valor : null;
  } catch {
    return null;
  }
}

export function guardarPais(pais: string): void {
  guardar(CLAVES.pais, pais);
}

/** La persona ya confirmó idioma y país en la bienvenida. */
export function leerBienvenidaCompleta(): boolean {
  try {
    return Storage.getItemSync(CLAVES.bienvenida) === '1';
  } catch {
    return false;
  }
}

export function guardarBienvenidaCompleta(): void {
  guardar(CLAVES.bienvenida, '1');
}

/**
 * Día (`AAAA-MM-DD`) en que se vio por última vez la apertura del vitral de Hoy (guía de movimiento,
 * nivel 1: una vez por día), o `null` si nunca.
 */
export function leerUltimaAperturaVitral(): string | null {
  try {
    const valor = Storage.getItemSync(CLAVES.aperturaVitral);
    return valor !== null && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
  } catch {
    return null;
  }
}

export function guardarUltimaAperturaVitral(dia: string): void {
  guardar(CLAVES.aperturaVitral, dia);
}
