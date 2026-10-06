/**
 * "Otra oración": desplazamiento por emoción que vive solo en memoria, durante la sesión.
 * No se guarda en el teléfono ni se cuenta (principio 1). Al cerrar la app vuelve a 0,
 * y también al cambiar el día (cada día empieza con su propia entrada).
 */
import { useCallback, useSyncExternalStore } from 'react';

import { indiceDelDia } from './emociones';

const desplazamientos = new Map<string, { dia: number; n: number }>();
const oyentes = new Set<() => void>();

function avisar() {
  for (const o of oyentes) o();
}

export function desplazamientoDe(emocionId: string, fecha: Date = new Date()): number {
  const d = desplazamientos.get(emocionId);
  return d && d.dia === indiceDelDia(fecha) ? d.n : 0;
}

export function otraOracion(emocionId: string, fecha: Date = new Date()): void {
  desplazamientos.set(emocionId, { dia: indiceDelDia(fecha), n: desplazamientoDe(emocionId, fecha) + 1 });
  avisar();
}

/** Vuelve todo a 0 ("Borrar mis datos" y pruebas). */
export function reiniciarOtraOracion(): void {
  desplazamientos.clear();
  avisar();
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/**
 * `[desplazamiento, avanzar]` para una emoción en la fecha dada (pásale `useAhora()` para que
 * vuelva a 0 a medianoche).
 */
export function useOtraOracion(emocionId: string, fecha?: Date): [number, () => void] {
  const leer = () => desplazamientoDe(emocionId, fecha);
  const desplazamiento = useSyncExternalStore(suscribir, leer, leer);
  const avanzar = useCallback(() => otraOracion(emocionId, fecha), [emocionId, fecha]);
  return [desplazamiento, avanzar];
}
