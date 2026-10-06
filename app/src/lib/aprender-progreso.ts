/**
 * Progreso de Aprender: une las reglas de `aprender.ts` con lo guardado en `progreso.ts`.
 *
 * - Al aprobar el quiz: se guarda la medalla (con su fecha), quedan descubiertos los 3 rasgos de la
 *   lectura y se otorgan las medallas de colección que se completen.
 * - Al reprobar: no se escribe nada. No se pierde nada y se puede reintentar de inmediato.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { contenido } from '@/contenido';
import type { Contenido, Lectura } from '@/contenido/tipos';

import { aprueba, coleccionesPorOtorgar } from './aprender';
import {
  descubrirRasgo,
  ganarMedalla,
  ganarMedallaColeccion,
  medallas,
  medallasColeccion,
  todosLosRasgos,
} from './progreso';

export type ResultadoQuiz = {
  aciertos: number;
  aprobado: boolean;
  /** Primera vez que se gana la medalla de esta lectura. */
  medallaNueva: boolean;
  /** Ids de colecciones cuya medalla se ganó con este quiz. */
  coleccionesNuevas: string[];
};

type ContenidoAprender = Pick<Contenido, 'lecturas' | 'proximamente' | 'colecciones'>;

export async function registrarResultadoQuiz(
  lectura: Lectura,
  aciertos: number,
  c: ContenidoAprender = contenido,
): Promise<ResultadoQuiz> {
  if (!aprueba(lectura, aciertos)) {
    return { aciertos, aprobado: false, medallaNueva: false, coleccionesNuevas: [] };
  }
  const antes = new Set((await medallas()).map((m) => m.lectura));
  await ganarMedalla(lectura.id, aciertos);
  for (const r of lectura.traits) await descubrirRasgo(lectura.id, r);

  const conMedalla = new Set(antes).add(lectura.id);
  const ganadas = new Set((await medallasColeccion()).map((m) => m.coleccion));
  const coleccionesNuevas = coleccionesPorOtorgar(c, lectura.id, conMedalla, ganadas);
  for (const id of coleccionesNuevas) await ganarMedallaColeccion(id);

  return { aciertos, aprobado: true, medallaNueva: !antes.has(lectura.id), coleccionesNuevas };
}

export type ProgresoAprender = {
  /** Lectura → fecha ISO de la medalla. */
  medallas: Map<string, string>;
  /** Lectura → rasgos descubiertos (orden de descubrimiento; usar `rasgosEnOrden` para la medalla). */
  rasgos: Record<string, string[]>;
  /** Colección → fecha ISO de su medalla. */
  colecciones: Map<string, string>;
};

const VACIO: ProgresoAprender = { medallas: new Map(), rasgos: {}, colecciones: new Map() };

/** Mismo progreso (medallas, rasgos y colecciones con sus fechas). */
export function mismoProgreso(a: ProgresoAprender, b: ProgresoAprender): boolean {
  const firma = (p: ProgresoAprender) => JSON.stringify([[...p.medallas], p.rasgos, [...p.colecciones]]);
  return firma(a) === firma(b);
}

export async function leerProgresoAprender(): Promise<ProgresoAprender> {
  const [m, r, c] = await Promise.all([medallas(), todosLosRasgos(), medallasColeccion()]);
  return {
    medallas: new Map(m.map((x) => [x.lectura, x.ganadaEn])),
    rasgos: r,
    colecciones: new Map(c.map((x) => [x.coleccion, x.ganadaEn])),
  };
}

/**
 * Progreso de Aprender, releído cada vez que la pantalla gana el foco (al volver del lector o del quiz).
 * `cargado` es `false` hasta la primera lectura: así la vitrina no parpadea mostrando todo bloqueado.
 */
export function useProgresoAprender(): ProgresoAprender & { cargado: boolean; recargar: () => void } {
  const [estado, setEstado] = useState<{ p: ProgresoAprender; cargado: boolean }>({ p: VACIO, cargado: false });
  const [version, setVersion] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      leerProgresoAprender()
        // Sin cambios (lo normal al cambiar de pestaña): se conserva el estado y Aprender no se
        // vuelve a dibujar entera (todas sus medallas Skia) durante el fundido de 200 ms.
        .then((p) => vivo && setEstado((e) => (e.cargado && mismoProgreso(e.p, p) ? e : { p, cargado: true })))
        .catch(() => vivo && setEstado((e) => ({ ...e, cargado: true })));
      return () => {
        vivo = false;
      };
    }, [version]),
  );

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { ...estado.p, cargado: estado.cargado, recargar };
}
