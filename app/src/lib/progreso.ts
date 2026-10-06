/**
 * Progreso local en SQLite (docs/decisiones.md, 2026-10-03: almacenamiento con expo-sqlite).
 * Nada de esto sale del teléfono.
 *
 * - velas:    qué días de cada novena se marcaron como rezados. No da puntos (principio 1).
 * - rasgos:   rasgos descubiertos al leer en Aprender.
 * - medallas: medallas ganadas en el quiz de Aprender.
 * - medallas_coleccion: colecciones de Aprender con todas sus lecturas publicadas con medalla.
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
  `CREATE TABLE IF NOT EXISTS medallas_coleccion (
     coleccion TEXT PRIMARY KEY NOT NULL,
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

/** Rasgos descubiertos de todas las lecturas (para la vitrina). */
export async function todosLosRasgos(): Promise<Record<string, string[]>> {
  const db = await baseProgreso();
  const filas = await db.getAllAsync<{ lectura: string; rasgo: string }>(
    'SELECT lectura, rasgo FROM rasgos ORDER BY descubierto_en',
  );
  const r: Record<string, string[]> = {};
  for (const f of filas) (r[f.lectura] ??= []).push(f.rasgo);
  return r;
}

/** Guarda el rasgo una sola vez. Devuelve `true` si es nuevo (solo entonces se muestra el aviso). */
export async function descubrirRasgo(lectura: string, rasgo: string): Promise<boolean> {
  const db = await baseProgreso();
  const r = await db.runAsync(
    'INSERT OR IGNORE INTO rasgos (lectura, rasgo, descubierto_en) VALUES (?, ?, ?)',
    lectura,
    rasgo,
    ahora(),
  );
  return r.changes > 0;
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

// Medallas de colección -------------------------------------------------------------------------

export async function medallasColeccion(): Promise<{ coleccion: string; ganadaEn: string }[]> {
  const db = await baseProgreso();
  const filas = await db.getAllAsync<{ coleccion: string; ganada_en: string }>(
    'SELECT coleccion, ganada_en FROM medallas_coleccion ORDER BY ganada_en',
  );
  return filas.map((f) => ({ coleccion: f.coleccion, ganadaEn: f.ganada_en }));
}

/** Guarda la medalla de la colección una sola vez (conserva la fecha original). */
export async function ganarMedallaColeccion(coleccion: string): Promise<void> {
  const db = await baseProgreso();
  await db.runAsync(
    'INSERT OR IGNORE INTO medallas_coleccion (coleccion, ganada_en) VALUES (?, ?)',
    coleccion,
    ahora(),
  );
}

// Borrar todo ------------------------------------------------------------------------------------

/**
 * Vacía todas las tablas de progreso ("Borrar mis datos"). Conserva el esquema y su versión, así
 * que la base queda como recién creada. Recorre `sqlite_master` para no olvidar tablas futuras.
 */
export async function borrarProgreso(): Promise<void> {
  const db = await baseProgreso();
  const tablas = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  await db.withTransactionAsync(async () => {
    for (const { name } of tablas) {
      // Nombres que vienen del propio esquema; igual se validan (identificador SQL simple).
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Tabla con nombre inesperado: ${name}`);
      await db.execAsync(`DELETE FROM ${name}`);
    }
  });
}
