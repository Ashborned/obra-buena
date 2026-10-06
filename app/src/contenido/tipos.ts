/**
 * Tipos de `content/contenido.json`, derivados de `content/schema.md`.
 * Si cambia el esquema, se cambia aquí y en `scripts/validar-contenido.mjs`.
 *
 * Convención del esquema: los arreglos `[es, en]` llevan primero el español.
 */

export type Revision = 'borrador' | 'pendiente' | 'aprobado' | 'rechazado';

/** Par de textos `[es, en]`. */
export type Par = [string, string];
/** Texto por idioma. */
export type Bilingue = { es: string; en: string };

/** Código ISO 3166-1 alfa-2 (el mismo que da expo-localization), p. ej. "CL". */
export type CodigoPais = string;

export type IdEmocion =
  | 'happy'
  | 'tired'
  | 'healing'
  | 'depression'
  | 'sad'
  | 'confused'
  | 'anger'
  | 'joy'
  | 'lonely'
  | 'love'
  | 'forgiveness'
  | 'gratitude';

export type Companero = {
  ini: string;
  /** Id de novena (opcional). */
  nov?: string;
  /** Id de lectura (opcional). */
  lrn?: string;
  /** [nombre, línea]. */
  es: Par;
  en: Par;
  /** URLs que respaldan la línea del santo. Obligatorio en entradas nuevas. */
  fuentes?: string[];
};

export type EntradaEmocion = {
  /** Referencia bíblica [es, en]. */
  ref: Par;
  /** Versículo [RV1909, KJV]. */
  v: Par;
  /** Oración [es, en]. */
  p: Par;
  c: Companero;
  revision: Revision;
};

export type Emocion = {
  id: IdEmocion;
  es: string;
  en: string;
  /** 1: muestra la tarjeta de ayuda del país. */
  care?: number;
  items: EntradaEmocion[];
};

export type ColorLiturgicoMedalla = 'green' | 'white' | 'red' | 'purple';

export type SeccionLectura = {
  h: string;
  /** Rasgo que se descubre en esta sección. */
  trait?: string;
  ps: string[];
  /** [cita, referencia]. */
  q?: string[];
  ps2?: string[];
};

export type PreguntaQuiz = {
  q: string;
  o: string[];
  /** Índice de la respuesta correcta. */
  a: number;
  /** Explicación con fuente. */
  e: string;
};

export type LecturaIdioma = {
  name: string;
  sub: string;
  ring: string;
  secs: SeccionLectura[];
  quiz: PreguntaQuiz[];
};

export type Lectura = {
  id: string;
  ini: string;
  lit: ColorLiturgicoMedalla;
  mins: number;
  pass: number;
  /** 3 claves de `rasgos`; la primera es la principal de la medalla. */
  traits: string[];
  fuentes: string[];
  revision: Revision;
  es: LecturaIdioma;
  en: LecturaIdioma;
};

export type Rasgo = { es: Par; en: Par };

export type Coleccion = {
  id: string;
  /** La colección se muestra primero en este país; los demás la ven igual. */
  pais?: CodigoPais;
  es: string;
  en: string;
  /** Ids de `lecturas` o de `proximamente`. */
  items: string[];
};

export type Proximamente = {
  id: string;
  ini: string;
  es: { name: string; sub: string };
  en: { name: string; sub: string };
  revision: Revision;
};

type NovenaBase = { id: string; es: string; en: string; ini: string; revision: Revision };
export type FiestaMovilId = 'corpus_christi';

export type OracionDia = { es: string; en: string; revision?: Revision };

/**
 * Fiesta anual (mes y día), fiesta móvil calculada cada año (`movil`) o fecha única (`fixed`).
 * `dias`: 9 oraciones, una por día de la novena (opcional).
 */
export type Novena = NovenaBase & { dias?: OracionDia[] } & (
    | { m: number; d: number }
    | { movil: FiestaMovilId }
    | { fixed: number[] }
  );

/** Fiesta que algunos países celebran en otro día. */
export type Traslado = {
  fiesta: FiestaMovilId;
  a: 'domingo';
  paises: CodigoPais[];
  nota?: string;
  fuente?: string;
};

export type RangoCelebracion = 'solemnidad' | 'fiesta' | 'memoria' | 'memoria_libre';

export type SantoDelDia = {
  ini: string;
  /** Color litúrgico de la celebración. */
  lit: ColorLiturgicoMedalla;
  /** Rango en el Calendario Romano General; sin rango, manda el tiempo litúrgico. */
  rango?: RangoCelebracion;
  /** [nombre, subtítulo, resumen]. */
  es: string[];
  en: string[];
};

export type HistoriaIdioma = {
  /** Datos breves. */
  f: string[];
  /** Párrafos. */
  st: string[];
  q: string;
  qr: string;
  /** Oración. */
  pr: string;
};

export type HistoriaSanto = { es: HistoriaIdioma; en: HistoriaIdioma };

/** Evangelio de ejemplo mientras no haya fuente automática. Nunca se aprueba. */
export type EvangelioEjemplo = {
  ref: Par;
  /** [RV1909, KJV]. */
  t: Par;
  nota?: string;
  revision: Revision;
};

export type LineaAyuda = {
  nombre: Bilingue;
  /** Como se muestra. */
  numero: string;
  /** Como se marca (sin espacios). */
  marcar: string;
  detalle: Bilingue;
  fuente: string;
};

export type AyudaPais = {
  pais: CodigoPais;
  nombre: Bilingue;
  emergencia?: string;
  lineas: LineaAyuda[];
  notas?: unknown;
  verificado: string;
  revision: Revision;
};

export type AyudaRespaldo = {
  nombre: Bilingue;
  url: string;
  nota: Bilingue;
  fuente: string;
};

export type Ayuda = {
  respaldo: AyudaRespaldo;
  paises: AyudaPais[];
};

/** Patrocinio opcional: "Con el apoyo de…" en Configuración (docs/apoyo.md). */
export type Patrocinio = { nombre: Bilingue; url?: string };

export type Contenido = {
  version: number;
  generado: string;
  traducciones: Bilingue;
  emociones: Emocion[];
  lecturas: Lectura[];
  proximamente: Proximamente[];
  colecciones: Coleccion[];
  rasgos: Record<string, Rasgo>;
  /** Clave MM-DD. */
  santos_del_dia: Record<string, SantoDelDia>;
  /** Clave MM-DD. */
  historias_santos: Record<string, HistoriaSanto>;
  /** Ausente en producción (está en borrador a propósito). */
  evangelio_ejemplo?: EvangelioEjemplo;
  novenas: Novena[];
  traslados?: Traslado[];
  /** Revisión de `santos_del_dia` e `historias_santos` en bloque. */
  revision_santos_del_dia: Revision;
  ayuda: Ayuda;
  /** Ausente si no hay patrocinio. */
  patrocinio?: Patrocinio;
};
