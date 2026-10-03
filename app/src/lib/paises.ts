/**
 * Nombres y lista de países para el selector (bienvenida y Configuración). Puro: sin React.
 *
 * Nombres: ningún nombre de país se escribe en el código.
 * 1. `Intl.DisplayNames` si el motor lo trae (Hermes en Expo Go SDK 57 NO lo trae: comprobado en
 *    el emulador, `typeof Intl.DisplayNames === 'undefined'`; queda listo para cuando haya polyfill).
 * 2. Si no, el nombre que trae `content/contenido.json` → `ayuda.paises[].nombre`.
 * 3. Si no, el código ISO tal cual ("CL").
 *
 * Lista: primero el país del teléfono, luego los países con líneas de ayuda (ya filtrados por
 * revisión en producción) y, si algún día hay una fuente fiable, todos los códigos ISO 3166-1.
 * Hoy no hay lista completa instalada, así que "Otro país" equivale a no elegir (respaldo).
 */
import type { Ayuda, CodigoPais } from '@/contenido';

type Nombrador = { of: (codigo: string) => string | undefined };
type ConstructorNombres = new (idiomas: string[], opciones: { type: 'region' }) => Nombrador;

const cacheNombradores = new Map<string, Nombrador | null>();

function nombrador(idioma: string): Nombrador | null {
  if (cacheNombradores.has(idioma)) return cacheNombradores.get(idioma) ?? null;
  let n: Nombrador | null = null;
  try {
    const DisplayNames = (Intl as unknown as { DisplayNames?: ConstructorNombres }).DisplayNames;
    if (typeof DisplayNames === 'function') n = new DisplayNames([idioma], { type: 'region' });
  } catch {
    n = null;
  }
  cacheNombradores.set(idioma, n);
  return n;
}

/** Nombre del país en el idioma de la interfaz, o su código si no hay de dónde sacarlo. */
export function nombrePais(codigo: CodigoPais, idioma: string, ayuda: Ayuda): string {
  try {
    const nombre = nombrador(idioma)?.of(codigo);
    if (nombre && nombre !== codigo) return nombre;
  } catch {
    // Código no reconocido por el motor: se sigue con el contenido.
  }
  const datos = ayuda.paises.find((p) => p.pais === codigo)?.nombre;
  if (datos) return (datos as Record<string, string | undefined>)[idioma] ?? datos.en;
  return codigo;
}

export type IdSeccionPaises = 'actual' | 'telefono' | 'ayuda' | 'todos';
export type SeccionPaises = { id: IdSeccionPaises; codigos: CodigoPais[] };

/**
 * Secciones del selector sin repetir países: teléfono → con ayuda → todos (si hay lista completa).
 * Si el país elegido no aparece en ninguna (p. ej. cambió la región del teléfono), va primero en
 * "actual" para que se vea marcado. Las secciones vacías se omiten. Dentro de "ayuda" y "todos" se
 * ordena por nombre.
 */
export function seccionesPaises({
  actual = null,
  sistema,
  conAyuda,
  todos = [],
  nombre,
  idioma,
}: {
  actual?: CodigoPais | null;
  sistema: CodigoPais | null;
  conAyuda: CodigoPais[];
  todos?: CodigoPais[];
  nombre: (codigo: CodigoPais) => string;
  idioma: string;
}): SeccionPaises[] {
  const vistos = new Set<CodigoPais>();
  const tomar = (codigos: CodigoPais[]) =>
    codigos.filter((c) => {
      if (vistos.has(c)) return false;
      vistos.add(c);
      return true;
    });
  const ordenar = (codigos: CodigoPais[]) =>
    [...codigos].sort((a, b) => nombre(a).localeCompare(nombre(b), idioma));

  const secciones: SeccionPaises[] = [
    { id: 'telefono', codigos: tomar(sistema ? [sistema] : []) },
    { id: 'ayuda', codigos: tomar(ordenar(conAyuda)) },
    { id: 'todos', codigos: tomar(ordenar(todos)) },
  ];
  if (actual && !vistos.has(actual)) secciones.unshift({ id: 'actual', codigos: [actual] });
  return secciones.filter((s) => s.codigos.length > 0);
}

/** Minúsculas y sin tildes, para buscar "mexico" y encontrar "México". */
export function normalizarBusqueda(texto: string): string {
  let t = texto.trim().toLowerCase();
  try {
    t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch {
    // Sin `normalize`: se busca con tildes.
  }
  return t;
}

/** Filtra por nombre o por código ISO. */
export function filtrarPaises(
  codigos: CodigoPais[],
  consulta: string,
  nombre: (codigo: CodigoPais) => string,
): CodigoPais[] {
  const q = normalizarBusqueda(consulta);
  if (!q) return codigos;
  return codigos.filter(
    (c) => c.toLowerCase() === q || normalizarBusqueda(nombre(c)).includes(q),
  );
}
