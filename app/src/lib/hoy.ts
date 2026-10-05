/**
 * Datos de la pestaña Hoy, como funciones puras de (contenido, fecha).
 * La interfaz no calcula nada: pide estas funciones con la fecha local del teléfono.
 */
import type { Href } from 'expo-router';

import type { Contenido, HistoriaSanto, Novena, SantoDelDia } from '@/contenido/tipos';

import { horaSegunReloj, type HoraOracion } from './hora-oracion';
import { colorDelDia, type ColorDelDia } from './liturgia';
import { estadoNovena, inicioDelDia, type EstadoNovena } from './novenas';
import { fiestaDeNovena, trasladaAlDomingo, type ContextoCalendario } from './novenas-contenido';

/** Clave `MM-DD` de una fecha local (la de `santos_del_dia` e `historias_santos`). */
export function claveDia(fecha: Date): string {
  const t = inicioDelDia(fecha);
  return `${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export type SantoHoy = {
  clave: string;
  santo: SantoDelDia;
  /** Historia completa, si está cargada. */
  historia: HistoriaSanto | null;
  /** Novena cuya fiesta es este día, si existe (enlace "Rezar su novena"). */
  novena: Novena | null;
};

export { fiestaDeNovena } from './novenas-contenido';

/** Novena cuya fiesta anual cae en la clave `MM-DD` dada. */
export function novenaDelDiaDeFiesta(novenas: Novena[], clave: string): Novena | null {
  const [mes, dia] = clave.split('-').map(Number);
  return novenas.find((n) => 'm' in n && n.m === mes && n.d === dia) ?? null;
}

/**
 * Santo del día, o `null` si ese día no hay santo cargado.
 * Con `null` la interfaz muestra el respaldo sin santo: nunca se toma el de otro día.
 */
export function santoDelDia(c: Contenido, fecha: Date): SantoHoy | null {
  const clave = claveDia(fecha);
  const santo = c.santos_del_dia[clave];
  if (!santo) return null;
  return {
    clave,
    santo,
    historia: c.historias_santos[clave] ?? null,
    novena: novenaDelDiaDeFiesta(c.novenas, clave),
  };
}

/** Color litúrgico del día: el del santo si su rango lo permite; si no, el del tiempo litúrgico. */
export function colorLiturgicoDelDia(c: Contenido, fecha: Date, pais?: string | null): ColorDelDia {
  const corpusEnDomingo = trasladaAlDomingo('corpus_christi', { pais, traslados: c.traslados });
  return colorDelDia(fecha, c.santos_del_dia[claveDia(fecha)] ?? null, { corpusEnDomingo });
}

export type NovenaHoy = { novena: Novena; estado: EstadoNovena };

/**
 * Novena del día: la que es hoy su fiesta ("Hoy es su fiesta") o la que está en curso.
 * Si hay varias, primero la fiesta de hoy y después la más cercana a terminar.
 */
export function novenaDelDia(
  novenas: Novena[],
  fecha: Date,
  ctx: ContextoCalendario = {},
): NovenaHoy | null {
  const activas = novenas
    .map((novena) => ({ novena, estado: estadoNovena(fiestaDeNovena(novena, ctx), fecha) }))
    .filter(({ estado }) => estado.esFiesta || estado.dia !== null);
  if (!activas.length) return null;
  activas.sort((a, b) => {
    if (a.estado.esFiesta !== b.estado.esFiesta) return a.estado.esFiesta ? -1 : 1;
    return (b.estado.dia ?? 0) - (a.estado.dia ?? 0);
  });
  return activas[0];
}

/** Hora de oración (Laudes 05:00–11:59, Vísperas 12:00–19:59, Completas 20:00–04:59). */
export function horaDeOracion(fecha: Date): HoraOracion {
  return horaSegunReloj(fecha);
}

/** Ruta de la pantalla de historia del santo (contrato entre Hoy y `app/src/app/santo/[clave].tsx`). */
export function rutaHistoriaSanto(clave: string): Extract<Href, string> {
  // Las rutas tipadas no aceptan el patrón `/santo/${string}`; la forma la fija esta función.
  return `/santo/${clave}` as Extract<Href, string>;
}
