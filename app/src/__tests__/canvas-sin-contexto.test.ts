/// <reference types="jest" />
/*
 * Lo que se dibuja dentro de un <Canvas> de Skia NO recibe los contextos de React: Skia usa su propio
 * renderizador. En el emulador, `useTema()` dentro de la medalla lanzaba y la vitrina quedaba vacía,
 * pero las pruebas de interfaz pasaban porque el mock de Skia dibuja los hijos con React normal.
 *
 * Esta prueba es ESTÁTICA (por texto) y recorre src/components y src/app:
 * 1. Busca cada bloque <Canvas …>…</Canvas> y los componentes (nombres en Mayúscula) usados dentro.
 * 2. Resuelve cada nombre a su definición (en el mismo archivo o importada de '@/…' o './…').
 *    Las primitivas de Skia (Group, Path, Circle…) no se resuelven y se ignoran.
 * 3. Recorre también los componentes que esos componentes dibujan (todo eso sigue dentro del lienzo).
 * 4. Falla si alguno llama un hook de contexto: useContext, los hooks propios que usan useContext
 *    (calculados: useTema, usePais, useReducirMovimiento, useBienvenida…), useIdioma y los de
 *    librerías que dependen de un proveedor (useTranslation, router, navegación, safe area).
 *
 * Límites (análisis por texto, no AST):
 * - Una definición va desde su línea `function X` / `const X =` en la columna 0 hasta la siguiente
 *   declaración en la columna 0 (el código pasa por Prettier). Componentes anidados dentro de otra
 *   función o declarados con sangría no se ven.
 * - Solo sigue nombres usados como JSX (`<X`). Un componente pasado como prop (`render={X}`), creado
 *   con `createElement`, o un hook llamado indirectamente (p. ej. vía un objeto) no se detecta.
 * - Imports: solo con llaves y rutas '@/…' o relativas; `export *` y reexportaciones no se siguen.
 * - `children` que vienen de afuera no se analizan (se dibujan donde el padre los pone).
 * - Si `<Canvas` aparece dentro de una cadena o un comentario JSX se analiza igual (falso positivo
 *   posible, nunca un falso negativo por eso).
 */
declare const __dirname: string;
type Entrada = { name: string; isDirectory(): boolean };
const fs = require('fs') as {
  readdirSync(dir: string, o: { withFileTypes: true }): Entrada[];
  readFileSync(f: string, enc: 'utf8'): string;
  existsSync(p: string): boolean;
};
const path = require('path') as {
  resolve(...p: string[]): string;
  join(...p: string[]): string;
  dirname(p: string): string;
  relative(a: string, b: string): string;
};

const SRC = path.resolve(__dirname, '..');

// --- Analizador (puro: recibe { archivo → código }) -------------------------------------------------

export type Fuentes = Record<string, string>;

/** Hooks de librerías que leen un proveedor de React. */
const HOOKS_DE_LIBRERIAS = [
  'useContext',
  'use', // React 19: use(Contexto)
  'useTranslation',
  'useIdioma', // pedido explícito: se trata como de contexto aunque use useSyncExternalStore
  'useRouter',
  'useNavigation',
  'useLocalSearchParams',
  'useGlobalSearchParams',
  'usePathname',
  'useSegments',
  'useFocusEffect',
  'useIsFocused',
  'useTheme',
  'useSafeAreaInsets',
  'useSafeAreaFrame',
];

function sinComentarios(c: string): string {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1');
}

const DECLARACION = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s*\*?\s*([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*[=:])/gm;
const CUALQUIER_TOPE = /^(?:export|function|const|let|var|type|interface|class|import|enum|declare)\b/gm;

/** Definiciones de nivel superior de un archivo: nombre → cuerpo (texto). */
function definiciones(codigo: string): Record<string, string> {
  const topes = [...codigo.matchAll(CUALQUIER_TOPE)].map((m) => m.index!).sort((a, b) => a - b);
  const out: Record<string, string> = {};
  for (const m of codigo.matchAll(DECLARACION)) {
    const nombre = m[1] ?? m[2];
    const fin = topes.find((t) => t > m.index!) ?? codigo.length;
    out[nombre] = codigo.slice(m.index!, fin);
  }
  return out;
}

/** Imports con llaves: nombre local → { archivo resuelto, nombre exportado }. */
function importaciones(archivo: string, codigo: string, existe: (p: string) => string | null) {
  const out: Record<string, { archivo: string; nombre: string }> = {};
  for (const m of codigo.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const desde = m[2];
    let base: string | null = null;
    if (desde.startsWith('@/')) base = desde.slice(2);
    else if (desde.startsWith('.')) base = path.relative(SRC, path.resolve(SRC, path.dirname(archivo), desde)).replace(/\\/g, '/');
    if (base === null) continue;
    const resuelto = existe(base);
    if (!resuelto) continue;
    for (const parte of m[1].split(',')) {
      const p = parte.trim().replace(/^type\s+/, '');
      if (!p) continue;
      const [exportado, local] = p.split(/\s+as\s+/).map((x) => x.trim());
      out[local ?? exportado] = { archivo: resuelto, nombre: exportado };
    }
  }
  return out;
}

const usosJsx = (texto: string) => [...new Set([...texto.matchAll(/<([A-Z][\w$]*)\b/g)].map((m) => m[1]))];

export type Hallazgo = { archivo: string; componente: string; hook: string; via: string };

export function analizar(fuentes: Fuentes): { hallazgos: Hallazgo[]; revisados: string[]; hooksContexto: string[] } {
  const codigo: Fuentes = Object.fromEntries(Object.entries(fuentes).map(([f, c]) => [f, sinComentarios(c)]));
  const defs = Object.fromEntries(Object.entries(codigo).map(([f, c]) => [f, definiciones(c)]));
  const existe = (base: string) => {
    for (const ext of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) if (`${base}${ext}` in codigo) return `${base}${ext}`;
    return null;
  };
  const imps = Object.fromEntries(Object.entries(codigo).map(([f, c]) => [f, importaciones(f, c, existe)]));

  // Hooks propios de contexto: punto fijo sobre "usa useContext o un hook de contexto".
  const contexto = new Set(HOOKS_DE_LIBRERIAS);
  for (let cambio = true; cambio; ) {
    cambio = false;
    for (const d of Object.values(defs)) {
      for (const [nombre, cuerpo] of Object.entries(d)) {
        if (!/^use[A-Z]/.test(nombre) || contexto.has(nombre)) continue;
        const llamados = [...cuerpo.matchAll(/\b(use[A-Z]?\w*)\s*\(/g)].map((m) => m[1]).filter((h) => h !== nombre);
        if (llamados.some((h) => contexto.has(h))) {
          contexto.add(nombre);
          cambio = true;
        }
      }
    }
  }

  const hallazgos: Hallazgo[] = [];
  const revisados: string[] = [];
  const visto = new Set<string>();

  const resolver = (archivo: string, nombre: string): { archivo: string; nombre: string } | null => {
    if (defs[archivo]?.[nombre]) return { archivo, nombre };
    const imp = imps[archivo]?.[nombre];
    if (imp && defs[imp.archivo]?.[imp.nombre]) return imp;
    return null;
  };

  const visitar = (archivo: string, nombre: string, via: string) => {
    const r = resolver(archivo, nombre);
    if (!r) return; // primitiva de Skia u otra librería
    const clave = `${r.archivo}#${r.nombre}`;
    if (visto.has(clave)) return;
    visto.add(clave);
    revisados.push(clave);
    const cuerpo = defs[r.archivo][r.nombre];
    for (const m of cuerpo.matchAll(/\b(use[A-Z]?\w*)\s*\(/g)) {
      if (contexto.has(m[1])) hallazgos.push({ archivo: r.archivo, componente: r.nombre, hook: m[1], via });
    }
    for (const hijo of usosJsx(cuerpo)) visitar(r.archivo, hijo, `${via} > ${hijo}`);
  };

  for (const [archivo, c] of Object.entries(codigo)) {
    for (const bloque of c.matchAll(/<Canvas\b[\s\S]*?<\/Canvas>/g)) {
      for (const nombre of usosJsx(bloque[0]).filter((n) => n !== 'Canvas')) visitar(archivo, nombre, `${archivo} <Canvas> > ${nombre}`);
    }
  }
  return { hallazgos, revisados: revisados.sort(), hooksContexto: [...contexto].sort() };
}

// --- Lectura del proyecto -----------------------------------------------------------------------------

function archivos(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : archivos(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

/** Todo src (para resolver imports y hooks); el análisis parte de los <Canvas> que haya. */
const FUENTES: Fuentes = Object.fromEntries(
  archivos(SRC).map((f) => [path.relative(SRC, f).replace(/\\/g, '/'), fs.readFileSync(f, 'utf8')]),
);

// --- Pruebas -----------------------------------------------------------------------------------------

describe('componentes dentro de <Canvas> sin hooks de contexto', () => {
  const r = analizar(FUENTES);

  test('se encontraron los lienzos y los componentes dibujados dentro', () => {
    const conCanvas = Object.keys(FUENTES).filter((f) => /<Canvas\b/.test(FUENTES[f]));
    expect(conCanvas.length).toBeGreaterThanOrEqual(5);
    for (const f of conCanvas) expect(f).toMatch(/^(components|app)\//);
    // Los que motivaron esta prueba, y los de la acuñación, deben estar en el recorrido.
    for (const c of [
      'components/medalla.tsx#Silueta',
      'components/medalla.tsx#Disco',
      'components/medalla.tsx#Brillo',
      'components/icono-rasgo.tsx#DibujoRasgo',
      'components/acunacion.tsx#Rayos',
      'components/acunacion.tsx#Particulas',
      'components/acunacion.tsx#Particula',
    ]) {
      expect(r.revisados).toContain(c);
    }
  });

  test('los hooks de contexto propios se detectan (useTema, usePais, useReducirMovimiento…)', () => {
    for (const h of ['useTema', 'usePais', 'useNombrePais', 'useReducirMovimiento', 'usePreferenciaAnimaciones', 'useBienvenida', 'useReiniciar']) {
      expect(r.hooksContexto).toContain(h);
    }
  });

  test('ningún componente dibujado dentro de un <Canvas> llama un hook de contexto', () => {
    expect(r.hallazgos.map((h) => `${h.archivo}: ${h.componente} llama ${h.hook}() (${h.via})`)).toEqual([]);
  });
});

describe('el analizador detecta el error del emulador (casos sintéticos)', () => {
  const base: Fuentes = {
    'theme/index.ts': `
const Contexto = createContext(null);
export function useTema() {
  return useContext(Contexto);
}
`,
    'components/icono.tsx': `
import { useTema } from '@/theme';
export function Dibujo({ c }: { c: string }) {
  const { colores } = useTema();
  return <Path color={colores.texto} />;
}
export function DibujoLimpio({ c }: { c: string }) {
  return <Path color={c} />;
}
`,
  };

  test('useTema() dentro de un componente local usado en <Canvas> → hallazgo', () => {
    const r = analizar({
      ...base,
      'components/medalla.tsx': `
import { useTema } from '@/theme';
export function Medalla() {
  const { colores } = useTema();
  return (
    <Canvas>
      <Group>
        <Silueta linea={colores.linea} />
      </Group>
    </Canvas>
  );
}

function Silueta({ linea }: { linea: string }) {
  const { colores } = useTema();
  return <Circle color={colores.linea} />;
}
`,
    });
    expect(r.hallazgos).toEqual([
      expect.objectContaining({ archivo: 'components/medalla.tsx', componente: 'Silueta', hook: 'useTema' }),
    ]);
  });

  test('anidado e importado (<Canvas> > Disco > Dibujo de otro archivo) → hallazgo; fuera del lienzo no', () => {
    const r = analizar({
      ...base,
      'components/medalla.tsx': `
import { Dibujo, DibujoLimpio } from '@/components/icono';
import { useTema } from '@/theme';
export function Medalla() {
  const { colores } = useTema();
  return (
    <View>
      <Fuera />
      <Canvas>
        <Disco />
        <DibujoLimpio c={colores.texto} />
      </Canvas>
    </View>
  );
}
function Disco() {
  return <Dibujo c="x" />;
}
function Fuera() {
  const { t } = useTranslation();
  return <Text>{t('a')}</Text>;
}
`,
    });
    expect(r.hallazgos.map((h) => `${h.componente}:${h.hook}`)).toEqual(['Dibujo:useTema']);
  });

  test('hooks de librería con proveedor: useTranslation, useIdioma, useContext directo', () => {
    const r = analizar({
      'components/a.tsx': `
export function A() {
  return (
    <Canvas>
      <B />
      <C />
      <D />
    </Canvas>
  );
}
const B = () => {
  const { t } = useTranslation();
  return null;
};
const C = memo(function C() {
  const idioma = useIdioma();
  return null;
});
function D() {
  const x = useContext(Algo);
  const v = useDerivedValue(() => 1);
  return null;
}
`,
    });
    expect(r.hallazgos.map((h) => `${h.componente}:${h.hook}`).sort()).toEqual(['B:useTranslation', 'C:useIdioma', 'D:useContext']);
  });
});
