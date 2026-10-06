/**
 * Preferencias guardadas en el teléfono (paleta, hora de oración, animaciones, idioma, país, bienvenida,
 * letra del lector, hora de los recordatorios) con `expo-sqlite/kv-store`
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

import { acotarLetraLector, LETRA_LECTOR } from './aprender';
import type { PreferenciaHora } from './hora-oracion';

const CLAVES = {
  paleta: 'preferencias.paleta',
  hora: 'preferencias.hora',
  idioma: 'preferencias.idioma',
  pais: 'preferencias.pais',
  bienvenida: 'preferencias.bienvenida',
  aperturaVitral: 'preferencias.aperturaVitral',
  letraLector: 'preferencias.letraLector',
  animaciones: 'preferencias.animaciones',
  horaRecordatorio: 'preferencias.horaRecordatorio',
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

/** Tamaño de letra del lector de Aprender (15–23, ver `LETRA_LECTOR` en `aprender.ts`). */
export function leerLetraLector(): number {
  try {
    const valor = Storage.getItemSync(CLAVES.letraLector);
    return valor !== null && /^\d{2}$/.test(valor) ? acotarLetraLector(Number(valor)) : LETRA_LECTOR.porDefecto;
  } catch {
    return LETRA_LECTOR.porDefecto;
  }
}

export function guardarLetraLector(tamano: number): void {
  guardar(CLAVES.letraLector, String(acotarLetraLector(tamano)));
}

/**
 * Animaciones: `sistema` sigue "Reducir movimiento" del teléfono; `reducidas` las reduce siempre
 * (solo fundidos), aunque el teléfono no lo pida. Ver `animaciones.tsx`.
 */
export type PreferenciaAnimaciones = 'sistema' | 'reducidas';
const PREFERENCIAS_ANIMACIONES: readonly PreferenciaAnimaciones[] = ['sistema', 'reducidas'];

export function leerPreferenciaAnimaciones(): PreferenciaAnimaciones {
  return leer(CLAVES.animaciones, PREFERENCIAS_ANIMACIONES, 'sistema');
}

export function guardarPreferenciaAnimaciones(pref: PreferenciaAnimaciones): void {
  guardar(CLAVES.animaciones, pref);
}

/** Hora de los recordatorios si la persona no eligió otra (única fuente del 08:00). */
export const HORA_RECORDATORIO_POR_DEFECTO: Readonly<{ h: number; m: number }> = { h: 8, m: 0 };

/** Hora por defecto de los recordatorios de novena (`{ h, m }`); sin elegir, 08:00. */
export function leerHoraRecordatorio(): { h: number; m: number } {
  const porDefecto = { ...HORA_RECORDATORIO_POR_DEFECTO };
  try {
    const valor = Storage.getItemSync(CLAVES.horaRecordatorio);
    const m = valor !== null ? /^(\d{2}):(\d{2})$/.exec(valor) : null;
    if (!m) return porDefecto;
    const h = Number(m[1]);
    const min = Number(m[2]);
    return h < 24 && min < 60 ? { h, m: min } : porDefecto;
  } catch {
    return porDefecto;
  }
}

export function guardarHoraRecordatorio(hora: { h: number; m: number }): void {
  const dos = (n: number) => String(n).padStart(2, '0');
  guardar(CLAVES.horaRecordatorio, `${dos(hora.h)}:${dos(hora.m)}`);
}
