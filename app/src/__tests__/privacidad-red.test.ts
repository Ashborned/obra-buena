/// <reference types="jest" />
/*
 * Principio 2 · Sin llamadas de red con datos de la persona (docs/red.md).
 *
 * Recorre app/src (sin __tests__ y sin comentarios) y falla si aparece una API de red, un token de
 * push o una URL escrita en el código. Las salidas de la app (Linking.openURL / openSettings /
 * WebBrowser) se comparan con una LISTA EXACTA: agregar una nueva obliga a revisar esta prueba y
 * docs/red.md. También revisa package.json: sin analítica, informes de errores ni anuncios.
 */
declare const __dirname: string;
type Entrada = { name: string; isDirectory(): boolean };
const fs = require('fs') as {
  readdirSync(dir: string, o: { withFileTypes: true }): Entrada[];
  readFileSync(f: string, enc: 'utf8'): string;
};
const path = require('path') as {
  resolve(...p: string[]): string;
  join(...p: string[]): string;
  relative(a: string, b: string): string;
};

import datos from '../../../content/contenido.json';
import { prepararLlamada, urlTel } from '@/lib/llamar';

const APP = path.resolve(__dirname, '..', '..');
const SRC = path.join(APP, 'src');

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : archivos(p);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(e.name) ? [p] : [];
  });
}

/** Código sin comentarios (respeta "https://" dentro de cadenas). */
function codigo(f: string): string {
  return fs
    .readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

const rel = (f: string) => path.relative(SRC, f).replace(/\\/g, '/');
const FUENTES = archivos(SRC).map((f) => ({ archivo: rel(f), codigo: codigo(f) }));

test('se leyó app/src', () => {
  expect(FUENTES.length).toBeGreaterThan(30);
  expect(FUENTES.some((f) => f.archivo === 'lib/llamar.ts')).toBe(true);
});

describe('sin APIs de red en app/src', () => {
  const PROHIBIDAS: [string, RegExp][] = [
    ['fetch(', /(^|[^\w.])fetch\s*\(|\.fetch\s*\(/],
    ['XMLHttpRequest', /\bXMLHttpRequest\b/],
    ['WebSocket', /\bWebSocket\b/],
    ['EventSource', /\bEventSource\b/],
    ['axios', /\baxios\b/],
    ['sendBeacon', /\bsendBeacon\b/],
    ['getExpoPushTokenAsync', /\bgetExpoPushTokenAsync\b/],
    ['getDevicePushTokenAsync', /\bgetDevicePushTokenAsync\b/],
    ['addPushTokenListener', /\baddPushTokenListener\b/],
    ['expo-updates', /['"]expo-updates['"]/],
  ];

  test.each(PROHIBIDAS)('%s no aparece', (_n, re) => {
    const hallazgos = FUENTES.flatMap(({ archivo, codigo: c }) =>
      c.split('\n').flatMap((l, i) => (re.test(l) ? [`${archivo}:${i + 1}: ${l.trim()}`] : [])),
    );
    expect(hallazgos).toEqual([]);
  });

  test('ninguna URL http(s) escrita en el código (las URLs vienen del contenido)', () => {
    const hallazgos = FUENTES.flatMap(({ archivo, codigo: c }) =>
      c.split('\n').flatMap((l, i) => (/https?:\/\//.test(l) ? [`${archivo}:${i + 1}: ${l.trim()}`] : [])),
    );
    expect(hallazgos).toEqual([]);
  });

  test('ninguna imagen remota (source={{ uri }})', () => {
    const hallazgos = FUENTES.filter(({ codigo: c }) => /\buri\s*:/.test(c)).map((f) => f.archivo);
    expect(hallazgos).toEqual([]);
  });
});

describe('salidas de la app: lista exacta (docs/red.md)', () => {
  // archivo → llamada exacta. Una nueva salida hace fallar esta prueba: revisar y anotar en docs/red.md.
  const PERMITIDAS = [
    // Marcador del teléfono: siempre tel: (ver la prueba de urlTel abajo).
    'lib/llamar.ts: Linking.openURL(llamada.url)',
    // Find A Helpline: URL fija del contenido (ayuda.respaldo.url).
    'components/tarjeta-ayuda.tsx: Linking.openURL(ayuda.respaldo.url)',
    // Patrocinio (opcional): URL del contenido, https exigido por el validador.
    'components/config/apoyo.tsx: Linking.openURL(patrocinio.url)',
    // Ajustes del sistema cuando se negó el permiso de avisos.
    'app/novena/[id].tsx: Linking.openSettings()',
    'components/config/recordatorios.tsx: Linking.openSettings()',
  ].sort();

  const SALIDA = /\b(?:Linking\.(?:openURL|openSettings|sendIntent)|WebBrowser\.\w+|openBrowserAsync|openAuthSessionAsync|openURL)\s*\([^)]*\)/g;

  test('las salidas encontradas son exactamente las permitidas', () => {
    const encontradas = FUENTES.flatMap(({ archivo, codigo: c }) =>
      [...c.matchAll(SALIDA)].map((m) => `${archivo}: ${m[0].replace(/\s+/g, '')}`),
    ).sort();
    expect(encontradas).toEqual(PERMITIDAS);
  });

  test('llamar.ts solo arma URLs tel: (el número sale del contenido)', () => {
    expect(urlTel('988')).toBe('tel:988');
    expect(urlTel('*4141#')).toBe('tel:*4141%23');
    for (const p of (datos as { ayuda: { paises: { lineas: { marcar: string }[] }[] } }).ayuda.paises) {
      for (const l of p.lineas) {
        const r = prepararLlamada(l.marcar, 'android');
        if (r.tipo === 'marcador') expect(r.url).toMatch(/^tel:[0-9+*%]+$/);
      }
    }
  });

  test('la URL de respaldo es fija y sin datos de la persona (sin query ni fragmento)', () => {
    const u = new URL((datos as { ayuda: { respaldo: { url: string } } }).ayuda.respaldo.url);
    expect(u.protocol).toBe('https:');
    expect(u.hostname).toBe('findahelpline.com');
    expect(u.search).toBe('');
    expect(u.hash).toBe('');
  });

  test('el patrocinio, si existe, trae una URL https', () => {
    const pa = (datos as { patrocinio?: { url?: string } }).patrocinio;
    if (!pa?.url) return;
    expect(new URL(pa.url).protocol).toBe('https:');
  });

  test('las salidas abren URLs que vienen del contenido, nunca armadas con país, emoción o idioma', () => {
    for (const { codigo: c } of FUENTES) {
      for (const m of c.matchAll(/Linking\.openURL\(([^)]*)\)/g)) {
        expect(m[1]).not.toMatch(/`|\+|pais|emocion|idioma|lang|country/i);
      }
    }
  });
});

describe('package.json: sin analítica, informes de errores ni anuncios', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(APP, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

  const PROHIBIDAS =
    /firebase|sentry|amplitude|segment|mixpanel|admob|google-mobile-ads|analytics|bugsnag|crashlytics|datadog|appsflyer|branch|adjust|facebook|fbsdk|posthog|newrelic|onesignal|expo-insights|tracking-transparency|revenuecat|purchases|appcenter|instabug|logrocket|smartlook|heap/i;

  test('ninguna dependencia de analítica / errores / anuncios / compras con servidor', () => {
    expect(deps.filter((d) => PROHIBIDAS.test(d))).toEqual([]);
  });

  test('expo-updates hoy no está (si se agrega, anotar su descarga en docs/red.md y cambiar esta prueba)', () => {
    expect(deps).not.toContain('expo-updates');
  });

  test('sin token de push: expo-notifications se usa solo para avisos locales', () => {
    expect(deps).toContain('expo-notifications');
    const usos = FUENTES.filter(({ codigo: c }) => /PushToken|registerTaskAsync|getPushToken/i.test(c));
    expect(usos.map((f) => f.archivo)).toEqual([]);
  });
});
