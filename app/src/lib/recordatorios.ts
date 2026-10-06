/**
 * Recordatorios de novena: avisos locales, uno por cada día que falta (nunca hay servidor).
 *
 * - El permiso de notificaciones se pide al tocar "Avísame cada día", nunca al abrir la app.
 * - La persona elige la hora (por defecto 08:00).
 * - Desactivar cancela todos los avisos de esa novena y ese año.
 * - Los avisos no cuentan nada ni hablan de rachas (principio 1).
 */
import * as Notifications from 'expo-notifications';
import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';

import type { EstadoNovena } from './novenas';
import { sumarDias } from './novenas';
import { HORA_RECORDATORIO_POR_DEFECTO } from './preferencias';

export type Hora = { h: number; m: number };

/** Hora inicial si la persona no eligió otra en Configuración (la fuente vive en preferencias). */
export const HORA_POR_DEFECTO: Hora = HORA_RECORDATORIO_POR_DEFECTO;

export type AvisoPlaneado = { dia: number; fecha: Date };

/**
 * Avisos de los días que faltan de la novena, a la hora elegida.
 * Si hoy es un día de la novena y la hora ya pasó, hoy no se avisa.
 * Antes de empezar: los 9 días. Después del día 9 (o el día de la fiesta): ninguno.
 */
export function planRecordatorios(estado: EstadoNovena, hora: Hora, ahora: Date): AvisoPlaneado[] {
  const avisos: AvisoPlaneado[] = [];
  for (let dia = 1; dia <= 9; dia++) {
    const d = sumarDias(estado.inicio, dia - 1);
    const fecha = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hora.h, hora.m);
    if (fecha.getTime() > ahora.getTime()) avisos.push({ dia, fecha });
  }
  return avisos;
}

// Estado guardado ---------------------------------------------------------------------------------

type Guardado = { hora: Hora; ids: string[] };

const clave = (novena: string, anio: number) => `recordatorios.${novena}.${anio}`;

function leer(novena: string, anio: number): Guardado | null {
  try {
    const v = Storage.getItemSync(clave(novena, anio));
    return v ? (JSON.parse(v) as Guardado) : null;
  } catch {
    return null;
  }
}

export type RecordatorioActivo = { novena: string; anio: number; hora: Hora };

/** Todos los recordatorios activos guardados (para Configuración), ordenados por año y novena. */
export function recordatoriosActivos(): RecordatorioActivo[] {
  let claves: string[];
  try {
    claves = Storage.getAllKeysSync();
  } catch {
    return [];
  }
  const activos: RecordatorioActivo[] = [];
  for (const c of claves) {
    const m = /^recordatorios\.(.+)\.(\d{4})$/.exec(c);
    if (!m) continue;
    const anio = Number(m[2]);
    const hora = leer(m[1], anio)?.hora;
    if (hora) activos.push({ novena: m[1], anio, hora });
  }
  return activos.sort((a, b) => a.anio - b.anio || a.novena.localeCompare(b.novena));
}

/**
 * Olvida los recordatorios de fiestas de años anteriores a `anio` (sus avisos ya sonaron o vencieron;
 * no hay nada que cancelar). Así no se acumulan claves viejas en el teléfono.
 */
export function olvidarRecordatoriosPasados(anio: number): void {
  let claves: string[];
  try {
    claves = Storage.getAllKeysSync();
  } catch {
    return;
  }
  for (const c of claves) {
    const m = /^recordatorios\..+\.(\d{4})$/.exec(c);
    if (!m || Number(m[1]) >= anio) continue;
    try {
      Storage.removeItemSync(c);
    } catch {
      // Se intentará de nuevo la próxima vez.
    }
  }
}

/** Los avisos de esa novena y ese año están activos; devuelve su hora, o `null`. */
export function recordatorioActivo(novena: string, anio: number): Hora | null {
  return leer(novena, anio)?.hora ?? null;
}

// Programar y cancelar ----------------------------------------------------------------------------

export type ResultadoActivar = { ok: true; programados: number } | { ok: false; motivo: 'sin-permiso' };

const CANAL = 'novenas';

async function asegurarPermiso(): Promise<boolean> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/**
 * Pide el permiso (si hace falta) y programa un aviso por cada día que falta.
 * `textos(dia)` da el título y el cuerpo ya traducidos (la interfaz usa i18n).
 */
export async function activarRecordatorios(opciones: {
  novena: string;
  anio: number;
  estado: EstadoNovena;
  hora: Hora;
  textos: (dia: number) => { titulo: string; cuerpo: string };
  canal?: string;
  ahora?: Date;
}): Promise<ResultadoActivar> {
  const { novena, anio, estado, hora, textos } = opciones;
  if (!(await asegurarPermiso())) return { ok: false, motivo: 'sin-permiso' };
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: opciones.canal ?? 'Novenas',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await desactivarRecordatorios(novena, anio);
  const plan = planRecordatorios(estado, hora, opciones.ahora ?? new Date());
  // Sin días por delante no queda nada activo (la pantalla esconde el botón en ese caso).
  if (plan.length === 0) return { ok: true, programados: 0 };
  const ids: string[] = [];
  for (const aviso of plan) {
    const { titulo, cuerpo } = textos(aviso.dia);
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { title: titulo, body: cuerpo, data: { novena, dia: aviso.dia } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: aviso.fecha, channelId: CANAL },
      }),
    );
  }
  try {
    await Storage.setItemAsync(clave(novena, anio), JSON.stringify({ hora, ids } satisfies Guardado));
  } catch {
    // Sin almacenamiento: los avisos quedan programados, pero el interruptor no recordará su estado.
  }
  return { ok: true, programados: ids.length };
}

/** Cancela los avisos de esa novena y ese año. */
export async function desactivarRecordatorios(novena: string, anio: number): Promise<void> {
  const guardado = leer(novena, anio);
  if (guardado) {
    await Promise.all(guardado.ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  }
  try {
    await Storage.removeItemAsync(clave(novena, anio));
  } catch {
    // Nada que hacer: no había nada guardado.
  }
}
