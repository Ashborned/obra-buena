/// <reference types="jest" />
/*
 * Hito 7 · Configuración: cada preferencia se guarda y sobrevive al reinicio.
 *
 * El kv-store simulado vive fuera del registro de módulos (`mockKV`), así que persiste entre
 * `jest.isolateModules`: guardar → "cerrar la app" (soltar el módulo) → reimportar → leer.
 * Valores inválidos o un almacenamiento que falla → valor por defecto, sin lanzar.
 *
 * También: la hora fija de Configuración manda sobre el reloj; 'auto' sigue al reloj.
 */
import { horaEfectiva, horaSegunReloj, type PreferenciaHora } from '../hora-oracion';

const mockKV: Record<string, string> = {};
let mockFallaLectura = false;
let mockFallaEscritura = false;

jest.mock('expo-sqlite/kv-store', () => {
  const Storage = {
    getItemSync: (k: string) => {
      if (mockFallaLectura) throw new Error('kv no disponible');
      return k in mockKV ? mockKV[k] : null;
    },
    setItemAsync: async (k: string, v: string) => {
      if (mockFallaEscritura) throw new Error('kv lleno');
      mockKV[k] = v;
    },
  };
  return { __esModule: true, default: Storage, Storage };
});

type Prefs = typeof import('../preferencias');

/** Importa una copia nueva del módulo (como al abrir la app otra vez). */
function abrirApp(): Prefs {
  let m!: Prefs;
  jest.isolateModules(() => {
    m = require('../preferencias');
  });
  return m;
}

/** Deja correr la escritura asíncrona. */
const esperar = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  for (const k of Object.keys(mockKV)) delete mockKV[k];
  mockFallaLectura = false;
  mockFallaEscritura = false;
});

describe('sin nada guardado (recién instalada): valores por defecto', () => {
  test('todas las preferencias', () => {
    const P = abrirApp();
    const { PALETA_POR_DEFECTO } = require('@/theme/paletas');
    expect(P.leerPaleta()).toBe(PALETA_POR_DEFECTO);
    expect(P.leerPreferenciaHora()).toBe('auto');
    expect(P.PREFERENCIA_HORA_POR_DEFECTO).toBe('auto');
    expect(P.leerPreferenciaAnimaciones()).toBe('sistema');
    expect(P.leerIdioma(['es', 'en'] as const)).toBeNull();
    expect(P.leerPais()).toBeNull();
    expect(P.leerBienvenidaCompleta()).toBe(false);
    expect(P.leerLetraLector()).toBe(17);
    expect(P.leerHoraRecordatorio()).toEqual({ h: 8, m: 0 });
    expect(P.leerUltimaAperturaVitral()).toBeNull();
  });
});

describe('guardar → reabrir la app → leer devuelve lo guardado', () => {
  test('paleta (cada una)', async () => {
    const { PALETAS_IDS } = require('@/theme/paletas') as typeof import('@/theme/paletas');
    expect(PALETAS_IDS.length).toBe(2);
    for (const id of PALETAS_IDS) {
      abrirApp().guardarPaleta(id);
      await esperar();
      expect(abrirApp().leerPaleta()).toBe(id);
    }
  });

  test.each<PreferenciaHora>(['day', 'dusk', 'night', 'auto'])('hora de oración %p', async (pref) => {
    abrirApp().guardarPreferenciaHora(pref);
    await esperar();
    expect(abrirApp().leerPreferenciaHora()).toBe(pref);
  });

  test.each(['reducidas', 'sistema'] as const)('animaciones %p', async (pref) => {
    abrirApp().guardarPreferenciaAnimaciones(pref);
    await esperar();
    expect(mockKV['preferencias.animaciones']).toBe(pref);
    expect(abrirApp().leerPreferenciaAnimaciones()).toBe(pref);
  });

  test('animaciones: volver a "sistema" después de "reducidas"', async () => {
    abrirApp().guardarPreferenciaAnimaciones('reducidas');
    await esperar();
    abrirApp().guardarPreferenciaAnimaciones('sistema');
    await esperar();
    expect(abrirApp().leerPreferenciaAnimaciones()).toBe('sistema');
  });

  test.each(['es', 'en'] as const)('idioma %p', async (idioma) => {
    abrirApp().guardarIdioma(idioma);
    await esperar();
    expect(abrirApp().leerIdioma(['es', 'en'] as const)).toBe(idioma);
  });

  test.each(['CL', 'US', 'ES', 'ZZ'])('país %p', async (pais) => {
    abrirApp().guardarPais(pais);
    await esperar();
    expect(abrirApp().leerPais()).toBe(pais);
  });

  test('bienvenida completa', async () => {
    abrirApp().guardarBienvenidaCompleta();
    await esperar();
    expect(abrirApp().leerBienvenidaCompleta()).toBe(true);
  });

  test.each([15, 19, 23])('letra del lector %p', async (n) => {
    abrirApp().guardarLetraLector(n);
    await esperar();
    expect(abrirApp().leerLetraLector()).toBe(n);
  });

  test.each([
    [{ h: 8, m: 0 }, '08:00'],
    [{ h: 0, m: 0 }, '00:00'],
    [{ h: 6, m: 5 }, '06:05'],
    [{ h: 21, m: 45 }, '21:45'],
    [{ h: 23, m: 59 }, '23:59'],
  ])('hora de recordatorio %p', async (hora, texto) => {
    abrirApp().guardarHoraRecordatorio(hora);
    await esperar();
    expect(mockKV['preferencias.horaRecordatorio']).toBe(texto);
    expect(abrirApp().leerHoraRecordatorio()).toEqual(hora);
  });

  test('apertura del vitral', async () => {
    abrirApp().guardarUltimaAperturaVitral('2026-10-05');
    await esperar();
    expect(abrirApp().leerUltimaAperturaVitral()).toBe('2026-10-05');
  });

  test('todas a la vez no se pisan entre sí', async () => {
    const P = abrirApp();
    P.guardarPaleta('vitral');
    P.guardarPreferenciaHora('night');
    P.guardarPreferenciaAnimaciones('reducidas');
    P.guardarIdioma('en');
    P.guardarPais('US');
    P.guardarBienvenidaCompleta();
    P.guardarLetraLector(21);
    P.guardarHoraRecordatorio({ h: 20, m: 30 });
    await esperar();
    const Q = abrirApp();
    expect(Q.leerPaleta()).toBe('vitral');
    expect(Q.leerPreferenciaHora()).toBe('night');
    expect(Q.leerPreferenciaAnimaciones()).toBe('reducidas');
    expect(Q.leerIdioma(['es', 'en'] as const)).toBe('en');
    expect(Q.leerPais()).toBe('US');
    expect(Q.leerBienvenidaCompleta()).toBe(true);
    expect(Q.leerLetraLector()).toBe(21);
    expect(Q.leerHoraRecordatorio()).toEqual({ h: 20, m: 30 });
    // Cada preferencia en su propia clave.
    expect(new Set(Object.keys(mockKV)).size).toBe(Object.keys(mockKV).length);
    expect(Object.keys(mockKV).every((k) => k.startsWith('preferencias.'))).toBe(true);
  });
});

describe('valores guardados inválidos → por defecto', () => {
  const P = () => abrirApp();

  test.each(['', 'rosa', 'VITRAL', ' vitral', 'null'])('paleta %p', (v) => {
    mockKV['preferencias.paleta'] = v;
    const { PALETA_POR_DEFECTO } = require('@/theme/paletas');
    expect(P().leerPaleta()).toBe(PALETA_POR_DEFECTO);
  });

  test.each(['', 'noon', 'Day', 'AUTO', 'night '])('hora de oración %p', (v) => {
    mockKV['preferencias.hora'] = v;
    expect(P().leerPreferenciaHora()).toBe('auto');
  });

  test.each(['', 'reducida', 'Reducidas', 'none', 'true', '1'])('animaciones %p', (v) => {
    mockKV['preferencias.animaciones'] = v;
    expect(P().leerPreferenciaAnimaciones()).toBe('sistema');
  });

  test.each(['', 'fr', 'ES', 'es-CL', 'en '])('idioma %p → null (manda el del teléfono)', (v) => {
    mockKV['preferencias.idioma'] = v;
    expect(P().leerIdioma(['es', 'en'] as const)).toBeNull();
  });

  test.each(['', 'cl', 'CHL', 'C1', ' CL', '419'])('país %p → null (manda la región)', (v) => {
    mockKV['preferencias.pais'] = v;
    expect(P().leerPais()).toBeNull();
  });

  test.each(['', '0', 'true', 'si', '11'])('bienvenida %p → no completa', (v) => {
    mockKV['preferencias.bienvenida'] = v;
    expect(P().leerBienvenidaCompleta()).toBe(false);
  });

  test.each(['', '8:00', '24:00', '12:60', '99:99', '08:00 ', 'ocho', '08-00', '-1:00', '08:5'])(
    'hora de recordatorio %p → 08:00',
    (v) => {
      mockKV['preferencias.horaRecordatorio'] = v;
      expect(P().leerHoraRecordatorio()).toEqual({ h: 8, m: 0 });
    },
  );

  test.each(['', '5-10-2026', '2026-10-5', 'hoy'])('apertura del vitral %p → null', (v) => {
    mockKV['preferencias.aperturaVitral'] = v;
    expect(P().leerUltimaAperturaVitral()).toBeNull();
  });
});

describe('almacenamiento que falla', () => {
  test('al leer: todo vuelve a su valor por defecto, sin lanzar', () => {
    mockFallaLectura = true;
    const P = abrirApp();
    expect(() => {
      P.leerPaleta();
      P.leerPreferenciaHora();
      P.leerPreferenciaAnimaciones();
      P.leerIdioma(['es', 'en'] as const);
      P.leerPais();
      P.leerBienvenidaCompleta();
      P.leerLetraLector();
      P.leerHoraRecordatorio();
    }).not.toThrow();
    expect(P.leerPreferenciaAnimaciones()).toBe('sistema');
    expect(P.leerHoraRecordatorio()).toEqual({ h: 8, m: 0 });
    expect(P.leerPais()).toBeNull();
  });

  test('al guardar: no lanza ni deja una promesa rechazada sin atender', async () => {
    mockFallaEscritura = true;
    const P = abrirApp();
    expect(() => {
      P.guardarPreferenciaAnimaciones('reducidas');
      P.guardarHoraRecordatorio({ h: 9, m: 0 });
      P.guardarPaleta('vitral');
    }).not.toThrow();
    await esperar();
    expect(mockKV).toEqual({});
  });
});

// -------------------------------------------------------------------------------------------------

describe('la hora fija de Configuración sobrescribe la del reloj', () => {
  const d = (h: number, min = 0) => new Date(2026, 9, 5, h, min);
  const relojes = [d(0), d(4, 59), d(5), d(11, 59), d(12), d(19, 59), d(20), d(23, 59)];

  test.each(['day', 'dusk', 'night'] as const)('%p: siempre esa hora, a cualquier hora del reloj', (fija) => {
    for (const r of relojes) expect(horaEfectiva(fija, r)).toBe(fija);
  });

  test("'auto' sigue al reloj (Laudes 05–11, Vísperas 12–19, Completas 20–04)", () => {
    expect(relojes.map((r) => horaEfectiva('auto', r))).toEqual([
      'night',
      'night',
      'day',
      'day',
      'dusk',
      'dusk',
      'night',
      'night',
    ]);
    for (const r of relojes) expect(horaEfectiva('auto', r)).toBe(horaSegunReloj(r));
  });

  test('preferencia guardada "night" + reabrir a mediodía → Completas', async () => {
    abrirApp().guardarPreferenciaHora('night');
    await esperar();
    expect(horaEfectiva(abrirApp().leerPreferenciaHora(), d(12))).toBe('night');
  });
});
