/**
 * Novenas del contenido: fecha de la fiesta según el país, estado de cada una, agrupación
 * para la lista y oración de cada día. Funciones puras de (novenas, fecha, contexto).
 *
 * Las velas son un registro personal (principio 1): aquí no hay rachas, puntos ni contadores.
 */
import type { CodigoPais, Novena, OracionDia, Traslado } from '@/contenido/tipos';

import { corpusChristi } from './liturgia';
import { estadoNovena, type EstadoNovena, type Fiesta } from './novenas';

/** Lo que cambia la fecha de una fiesta según dónde vive la persona. */
export type ContextoCalendario = {
  pais?: CodigoPais | null;
  traslados?: Traslado[];
};

/** El país traslada esa fiesta móvil al domingo. */
export function trasladaAlDomingo(fiesta: Traslado['fiesta'], ctx: ContextoCalendario = {}): boolean {
  if (!ctx.pais) return false;
  return (ctx.traslados ?? []).some(
    (t) => t.fiesta === fiesta && t.a === 'domingo' && t.paises.includes(ctx.pais as string),
  );
}

/** Fiesta de una novena en el formato de `novenas.ts`, resolviendo las móviles según el país. */
export function fiestaDeNovena(n: Novena, ctx: ContextoCalendario = {}): Fiesta {
  if ('movil' in n) {
    const domingo = trasladaAlDomingo(n.movil, ctx);
    return { calcular: (anio) => corpusChristi(anio, domingo) };
  }
  if ('fixed' in n) return { fecha: { anio: n.fixed[0], mes: n.fixed[1], dia: n.fixed[2] } };
  return { mes: n.m, dia: n.d };
}

export type GrupoNovena = 'enCurso' | 'proximas' | 'masAdelante';

export type NovenaConEstado = { novena: Novena; estado: EstadoNovena; grupo: GrupoNovena | null };

/** Días máximos para que una novena cuente como "próxima". */
export const DIAS_PROXIMA = 45;

/**
 * Grupo de la lista: "En curso" (días 1–9 o "Hoy es su fiesta"), "Próximas" (empieza en ≤ 45 días)
 * o "Más adelante". `null` para una fecha única que ya pasó (no se muestra).
 */
export function grupoDe(estado: EstadoNovena): GrupoNovena | null {
  if (estado.dia !== null || estado.esFiesta) return 'enCurso';
  if (estado.faltan < 0) return null;
  return estado.faltan <= DIAS_PROXIMA ? 'proximas' : 'masAdelante';
}

export function estadoDeNovena(n: Novena, fecha: Date, ctx: ContextoCalendario = {}): NovenaConEstado {
  const estado = estadoNovena(fiestaDeNovena(n, ctx), fecha);
  return { novena: n, estado, grupo: grupoDe(estado) };
}

export type NovenasAgrupadas = Record<GrupoNovena, NovenaConEstado[]>;

/** Novenas agrupadas para la lista, cada grupo ordenado por fecha de inicio. */
export function agruparNovenas(novenas: Novena[], fecha: Date, ctx: ContextoCalendario = {}): NovenasAgrupadas {
  const grupos: NovenasAgrupadas = { enCurso: [], proximas: [], masAdelante: [] };
  for (const n of novenas) {
    const x = estadoDeNovena(n, fecha, ctx);
    if (x.grupo) grupos[x.grupo].push(x);
  }
  for (const g of Object.values(grupos)) g.sort((a, b) => a.estado.inicio.getTime() - b.estado.inicio.getTime());
  return grupos;
}

/** Año de la fiesta: con él se guarda el progreso (una novena por fiesta y por año). */
export function anioDeFiesta(estado: EstadoNovena): number {
  return estado.fiesta.getFullYear();
}

export type OracionDelDia =
  | { tipo: 'oracion'; oracion: OracionDia }
  /** Desarrollo: aún no hay oración escrita para ese día. */
  | { tipo: 'marcador' }
  /** Producción: aún no hay oración escrita; mensaje neutro "Oración del día próximamente". */
  | { tipo: 'proximamente' };

/** Oración del día `dia` (1–9) de la novena. */
export function oracionDelDia(n: Novena, dia: number, modo: 'desarrollo' | 'produccion'): OracionDelDia {
  const oracion = n.dias?.[dia - 1];
  if (oracion) return { tipo: 'oracion', oracion };
  return { tipo: modo === 'desarrollo' ? 'marcador' : 'proximamente' };
}
