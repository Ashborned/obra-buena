/// <reference types="jest" />
/*
 * Hito 8 · El movimiento es UN sistema (docs/guia-movimiento.md, sección "Tokens"):
 *
 * 1. Duraciones, curvas y resortes salen de theme/movimiento.ts: ningún componente escribe una curva
 *    (`Easing.`), un resorte (`damping:`) ni importa expo-haptics por su cuenta.
 * 2. Calma en la oración: las pantallas de oración y lectura no tienen movimientos infinitos,
 *    rebotes ni partículas (lo de nivel 1 vive en componentes de recompensa aparte).
 * 3. La inclinación del vitral usa los sensores de Reanimated: no se instala expo-sensors ni se
 *    agregan permisos a app.json.
 *
 * Se revisa el código sin comentarios.
 */
declare const __dirname: string;
const fs = require('fs') as {
  readFileSync(f: string, enc: 'utf8'): string;
  readdirSync(d: string, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
};
const path = require('path') as { resolve(...p: string[]): string; relative(a: string, b: string): string };

const SRC = path.resolve(__dirname, '..');

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.resolve(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : archivos(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

const sinComentarios = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const codigo = archivos(SRC).map((f) => ({
  archivo: path.relative(SRC, f).replace(/\\/g, '/'),
  texto: sinComentarios(fs.readFileSync(f, 'utf8')),
}));

const donde = (re: RegExp) => codigo.filter((c) => re.test(c.texto)).map((c) => c.archivo).sort();
const texto = (a: string) => {
  const c = codigo.find((x) => x.archivo === a);
  if (!c) throw new Error(`No existe ${a}`);
  return c.texto;
};

describe('tokens de movimiento', () => {
  test('las curvas solo se escriben en theme/movimiento.ts', () => {
    expect(donde(/\bEasing\./)).toEqual(['theme/movimiento.ts']);
  });

  test('los resortes solo se escriben en theme/movimiento.ts', () => {
    expect(donde(/\bdamping\s*:/)).toEqual(['theme/movimiento.ts']);
  });

  test('las entradas de Reanimated con duración propia usan los atajos del sistema', () => {
    // FadeIn/FadeOut sueltos: solo dentro de los atajos (`fundido`, `entradaCalma`).
    expect(donde(/\bFade(In|Out)\b(?!Down)/)).toEqual(['theme/movimiento.ts']);
  });

  test('la vibración pasa por lib/vibracion.ts', () => {
    expect(donde(/expo-haptics/)).toEqual(['lib/vibracion.ts']);
  });
});

describe('calma en la oración (nivel 3)', () => {
  /** Pantallas de oración y lectura y sus piezas de texto. */
  const ORACION = [
    'app/(tabs)/emociones.tsx',
    'app/emocion/[id].tsx',
    'app/novena/[id].tsx',
    'app/lectura/[id].tsx',
    'app/santo/[clave].tsx',
    'components/tarjeta-evangelio.tsx',
    'components/mosaico-emocion.tsx',
    // Las nueve velas del detalle de novena: estallidos únicos, nada en bucle.
    'components/velas-novena.tsx',
  ];

  /** La vela que nace (nivel 1) es el único rebote y las únicas chispas permitidas aquí. */
  const VELAS = 'components/velas-novena.tsx';

  test.each(ORACION)('%s: sin movimientos infinitos ni resortes', (a) => {
    expect(texto(a)).not.toMatch(/withRepeat|withSpring|springify|resortes\./);
  });

  test.each(ORACION.filter((a) => a !== VELAS))('%s: sin rebotes ni partículas', (a) => {
    expect(texto(a)).not.toMatch(/curvas\.(rebote|giro|acunar)\b|Chispa|Particula/);
  });

  test('velas: el rebote y las chispas solo al nacer una llama; sin movimiento reducido no hay chispas', () => {
    const t = texto(VELAS);
    expect(t.match(/curvas\.rebote/g)).toHaveLength(1);
    expect(t).toMatch(/!reducir && CHISPAS\.map/);
  });

  test('vibran solo los momentos de nivel 1: la vela (novena) y el rasgo (lector)', () => {
    const vibran = ORACION.filter((a) => /useVibracion/.test(texto(a)));
    expect(vibran).toEqual(['app/novena/[id].tsx', 'app/lectura/[id].tsx']);
    expect(texto('app/novena/[id].tsx').match(/vibrar\('(\w+)'\)/g)?.sort()).toEqual([
      "vibrar('novenaCompleta')",
      "vibrar('vela')",
    ]);
    expect(texto('app/lectura/[id].tsx').match(/vibrar\('(\w+)'\)/g)).toEqual(["vibrar('rasgo')"]);
  });

  test('el detalle de novena no pide titileo a las velas (las llamas quedan quietas)', () => {
    expect(texto('app/novena/[id].tsx')).not.toMatch(/titilar/);
    expect(texto('components/velas-novena.tsx')).not.toMatch(/titilar|movimiento\.llamas/);
  });

  test('las pantallas de oración entran con entradaCalma o fundidos del sistema', () => {
    for (const a of ['app/(tabs)/emociones.tsx', 'app/emocion/[id].tsx', 'app/novena/[id].tsx', 'app/lectura/[id].tsx']) {
      expect(texto(a)).toMatch(/entradaCalma\(/);
    }
  });
});

describe('inclinación del vitral', () => {
  test('usa el sensor de gravedad de Reanimated, montado solo cuando corresponde', () => {
    const t = texto('components/vitral.tsx');
    expect(t).toMatch(/useAnimatedSensor\(SensorType\.GRAVITY/);
    expect(t).toMatch(/useInclinacionVitral\(\)\s*&&\s*vida/);
    expect(t).toMatch(/\{inclinar \? <SensorInclinacion/);
  });

  test('sin expo-sensors y sin permisos nuevos en app.json', () => {
    const paquete = JSON.parse(fs.readFileSync(path.resolve(SRC, '..', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(paquete.dependencies['expo-sensors']).toBeUndefined();
    const app = JSON.parse(fs.readFileSync(path.resolve(SRC, '..', 'app.json'), 'utf8')) as {
      expo: { ios?: { infoPlist?: object }; android?: { permissions?: string[] } };
    };
    expect(app.expo.android?.permissions ?? []).toEqual([]);
    expect(JSON.stringify(app.expo.ios?.infoPlist ?? {})).not.toMatch(/Motion/);
  });
});

/*
 * Hito 8 · QA (parte C): lo que la revisión del sistema no cubría.
 */
describe('nivel 2: los bucles infinitos viven solo en el ambiente y se detienen', () => {
  /** Los únicos componentes con withRepeat (todos de nivel 2, todos fuera de las pantallas de oración). */
  const AMBIENTE: Record<string, RegExp> = {
    'components/vitral.tsx': /if \(!vida \|\| reducir\)/,
    'components/fondo.tsx': /if \(!titilar \|\| reducir\)/,
    'components/boton-llamada.tsx': /if \(!activo \|\| reducir\)/,
    'components/velas-mini.tsx': /if \(!titilar \|\| reducir/,
  };

  test('withRepeat solo en los cuatro componentes de ambiente', () => {
    expect(donde(/withRepeat\(/)).toEqual(Object.keys(AMBIENTE).sort());
  });

  test.each(Object.entries(AMBIENTE))('%s: se apaga sin foco o con movimiento reducido y cancela al desmontar', (a, guardia) => {
    const t = texto(a);
    expect(t).toMatch(guardia);
    expect(t).toMatch(/return \(\) =>[^;]*cancelAnimation/);
  });

  test('Hoy y Novenas encienden el ambiente solo con la pestaña en foco', () => {
    const hoy = texto('app/(tabs)/index.tsx');
    expect(hoy).toMatch(/const enfocada = useIsFocused\(\)/);
    expect(hoy).toMatch(/<Fondo titilar=\{enfocada\}>/);
    expect(hoy).toMatch(/vida=\{enfocada\}/);
    expect(hoy.match(/activo=\{enfocada\}/g)).toHaveLength(2); // tarjeta de novena y botón
    const novenas = texto('app/(tabs)/novenas.tsx');
    expect(novenas).toMatch(/const enfocada = useIsFocused\(\)/);
    expect(novenas).toMatch(/titilar=\{enfocada\}/);
  });

  test('nada de temporizadores de JS por cuadro (setInterval / requestAnimationFrame)', () => {
    expect(donde(/\bsetInterval\(|\brequestAnimationFrame\(/)).toEqual([]);
  });

  test('useFrameCallback solo en la capa de la medalla que vuela (vive lo que dura el vuelo)', () => {
    expect(donde(/useFrameCallback\(/)).toEqual(['components/transiciones.tsx']);
  });
});

describe('cambio de pestaña', () => {
  test('fundido cruzado de 200 ms con el token, también con movimiento reducido', () => {
    expect(texto('theme/movimiento.ts')).toMatch(/\bcambioPestana: 200,/);
    const t = texto('app/(tabs)/_layout.tsx');
    expect(t).toMatch(/animation: 'fade'/);
    expect(t).toMatch(/duration: movimiento\.cambioPestana/);
  });

  test('volver a una pestaña no redibuja todo si los datos no cambiaron', () => {
    expect(texto('lib/aprender-progreso.ts')).toMatch(/mismoProgreso\(e\.p, p\) \? e :/);
    expect(texto('app/(tabs)/novenas.tsx')).toMatch(/\? previas : nuevas/);
  });
});

describe('inclinación: sin permisos', () => {
  test('ningún pedido de permisos de movimiento ni expo-sensors en el código', () => {
    expect(donde(/expo-sensors|DeviceMotion|Accelerometer|Gyroscope/)).toEqual([]);
    expect(donde(/requestPermissionsAsync/).filter((a) => !/avisos|recordatorios|notific/i.test(a))).toEqual([]);
  });

  test('el sensor solo se pide dentro de SensorInclinacion, que solo se monta con `inclinar`', () => {
    const t = texto('components/vitral.tsx');
    expect(t.match(/useAnimatedSensor\(/g)).toHaveLength(1);
    expect(t).toMatch(/function SensorInclinacion[\s\S]*?useAnimatedSensor\(/);
    expect(donde(/useAnimatedSensor\(/)).toEqual(['components/vitral.tsx']);
  });
});
