/**
 * Progreso local en SQLite (docs/decisiones.md, 2026-10-03: almacenamiento con expo-sqlite).
 * Nada de esto sale del teléfono.
 *
 * - velas:    qué días de cada novena se marcaron como rezados. No da puntos (principio 1).
 * - rasgos:   rasgos descubiertos al leer en Aprender.
 * - medallas: medallas ganadas en el quiz de Aprender.
 *
 * Las preferencias (paleta, hora, idioma, país) viven en `expo-sqlite/kv-store` (ver `preferencias.ts`).
 * Las migraciones se versionan con `PRAGMA user_version`: para cambiar el esquema se agrega
 * un elemento al final de `MIGRACIONES`, nunca se edita uno existente.
 */
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const NOMBRE_BD = 'progreso.db';

export const MIGRACIONES: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS velas (
     novena TEXT NOT NULL,
     anio_fiesta INTEGER NOT NULL,
     dia INTEGER NOT NULL CHECK (dia BETWEEN 1 AND 9),
     encendida_en TEXT NOT NULL,
     PRIMARY KEY (novena, anio_fiesta, dia)
   );
   CREATE TABLE IF NOT EXISTS rasgos (
     lectura TEXT NOT NULL,
     rasgo TEXT NOT NULL,
     descubierto_en TEXT NOT NULL,
     PRIMARY KEY (lectura, rasgo)
   );
   CREATE TABLE IF NOT EXISTS medallas (
     lectura TEXT PRIMARY KEY NOT NULL,
     puntaje INTEGER NOT NULL,
     ganada_en TEXT NOT NULL
   );`,
];

let bd: Promise<SQLiteDatabase> | null = null;

async function abrir(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(NOMBRE_BD);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const actual = fila?.user_version ?? 0;
  for (let v = actual; v < MIGRACIONES.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRACIONES[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return db;
}

/** Base de datos de progreso, abierta y migrada una sola vez. */
export function baseProgreso(): Promise<SQLiteDatabase> {
  bd ??= abrir().catch((e) => {
    bd = null;
    throw e;
  });
  return bd;
}

const ahora = () => new Date().toISOString();

// Velas -----------------------------------------------------------------------------------------

/** Días (1–9) con vela encendida para la novena de la fiesta de `anioFiesta`. */
export async function velasEncendidas(novena: string, anioFiesta: number): Promise<number[]> {
  const db = await baseProgreso();
  const filas = await db.getAllAsync<{ dia: number }>(
    'SELECT dia FROM velas WHERE novena = ? AND anio_fiesta = ? ORDER BY dia',
    novena,
    anioFiesta,
  );
  return filas.map((f) => f.dia);
}

export async function encenderVela(novena: string, anioFiesta: number, dia: number): Promise<void> {
  const db = await baseProgreso();
  await db.runAsync(
    'INSERT OR IGNORE INTO velas (novena, anio_fiesta, dia, encendida_en) VALUES (?, ?, ?, ?)',
    novena,
    anioFiesta,
    dia,
    ahora(),
  );
}

export async function apagarVela(novena: string, anioFiesta: number, dia: number): Promise<void> {
  const db = await baseProgreso();
  await db.runAsync(
    'DELETE FROM velas WHERE novena = ? AND anio_fiesta = ? AND dia = ?',
    novena,
    anioFiesta,
    dia,
  );
}

// Rasgos ----------------------------------------------------------------------------------------

export async function rasgosDescubiertos(lectura: string): Promise<string[]> {
  const db = await baseProgreso();
  const filas = await db.getAllAsync<{ rasgo: string }>(
    'SELECT rasgo FROM rasgos WHERE lectura = ? ORDER BY descubierto_en',
    lectura,
  );
  return filas.map((f) => f.rasgo);
}

export async function descubrirRasgo(lectura: string, rasgo: string): Promise<void> {
  const db = await baseProgreso();
  await db.runAsync(
    'INSERT OR IGNORE INTO rasgos (lectura, rasgo, descubierto_en) VALUES (?, ?, ?)',
    lectura,
    rasgo,
    ahora(),
  );
}

// Medallas --------------------------------------------------------------------------------------

export type Medalla = { lectura: string; puntaje: number; ganadaEn: string };

export async function medallas(): Promise<Medalla[]> {
  const db = await baseProgreso();
  const filas = await db.getAllAsync<{ lectura: string; puntaje: number; ganada_en: string }>(
    'SELECT lectura, puntaje, ganada_en FROM medallas ORDER BY ganada_en',
  );
  return filas.map((f) => ({ lectura: f.lectura, puntaje: f.puntaje, ganadaEn: f.ganada_en }));
}

/** Guarda la medalla; si ya existía, conserva el mejor puntaje y la fecha original. */
export async function ganarMedalla(lectura: string, puntaje: number): Promise<void> {
  const db = await baseProgreso();
  await db.runAsync(
    `INSERT INTO medallas (lectura, puntaje, ganada_en) VALUES (?, ?, ?)
     ON CONFLICT(lectura) DO UPDATE SET puntaje = MAX(puntaje, excluded.puntaje)`,
    lectura,
    puntaje,
    ahora(),
  );
}
