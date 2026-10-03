/// <reference types="jest" />
// Sin @types/node en el proyecto: tipos mínimos para leer archivos desde la prueba.
declare const __dirname: string;
type Entrada = { name: string; isDirectory(): boolean };
const fs = require('fs') as {
  readdirSync(dir: string, o: { withFileTypes: true }): Entrada[];
  readFileSync(f: string, enc: 'utf8'): string;
};
const path = require('path') as {
  resolve(...p: string[]): string;
  join(...p: string[]): string;
};

const mockGetLocales = jest.fn();
const mockLeerPais = jest.fn();

jest.mock('expo-localization', () => ({ getLocales: () => mockGetLocales() }));
jest.mock('../preferencias', () => ({ leerPais: () => mockLeerPais() }));

// eslint-disable-next-line import/first
import { paisDelSistema, paisInicial } from '../region';

const loc = (regionCode: string | null) => ({ languageTag: 'x', languageCode: 'es', regionCode });

beforeEach(() => {
  mockGetLocales.mockReset();
  mockLeerPais.mockReset().mockReturnValue(null);
});

describe('paisDelSistema', () => {
  test('toma el regionCode del primer locale', () => {
    mockGetLocales.mockReturnValue([loc('CL'), loc('US')]);
    expect(paisDelSistema()).toBe('CL');
  });

  test('normaliza minúsculas', () => {
    mockGetLocales.mockReturnValue([loc('es')]);
    expect(paisDelSistema()).toBe('ES');
  });

  test('si el primero es null y el segundo MX → MX', () => {
    mockGetLocales.mockReturnValue([loc(null), loc('MX')]);
    expect(paisDelSistema()).toBe('MX');
  });

  test('salta códigos no alfa-2 (p. ej. 419, región de América Latina)', () => {
    mockGetLocales.mockReturnValue([loc('419'), loc('AR')]);
    expect(paisDelSistema()).toBe('AR');
  });

  test('sin ninguna región válida → null', () => {
    mockGetLocales.mockReturnValue([loc(null), loc('419')]);
    expect(paisDelSistema()).toBeNull();
    mockGetLocales.mockReturnValue([]);
    expect(paisDelSistema()).toBeNull();
  });

  test('si getLocales lanza → null', () => {
    mockGetLocales.mockImplementation(() => {
      throw new Error('sin módulo nativo');
    });
    expect(paisDelSistema()).toBeNull();
  });
});

describe('paisInicial', () => {
  test('el país guardado manda sobre el del sistema', () => {
    mockLeerPais.mockReturnValue('ES');
    mockGetLocales.mockReturnValue([loc('CL')]);
    expect(paisInicial()).toBe('ES');
  });

  test('sin guardado → país del sistema', () => {
    mockGetLocales.mockReturnValue([loc('US')]);
    expect(paisInicial()).toBe('US');
  });

  test('sin guardado ni región → null (la bienvenida pide elegir)', () => {
    mockGetLocales.mockReturnValue([loc(null)]);
    expect(paisInicial()).toBeNull();
  });
});

describe('sin permiso de ubicación (principio 6)', () => {
  const raizApp = path.resolve(__dirname, '..', '..', '..');

  function archivos(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) return d.name === '__tests__' ? [] : archivos(p);
      return /\.(tsx?|jsx?)$/.test(d.name) ? [p] : [];
    });
  }

  test('nada en app/src importa expo-location ni pide permisos de ubicación', () => {
    const prohibido =
      /expo-location|requestForegroundPermissions|requestBackgroundPermissions|getCurrentPositionAsync|navigator\.geolocation|ACCESS_(FINE|COARSE)_LOCATION/;
    const culpables = archivos(path.join(raizApp, 'src')).filter((f) =>
      prohibido.test(fs.readFileSync(f, 'utf8')),
    );
    expect(culpables).toEqual([]);
  });

  test('ni package.json ni app.json declaran ubicación', () => {
    const pkg = fs.readFileSync(path.join(raizApp, 'package.json'), 'utf8');
    const app = fs.readFileSync(path.join(raizApp, 'app.json'), 'utf8');
    expect(pkg).not.toMatch(/expo-location/);
    expect(app).not.toMatch(/expo-location|NSLocation|ACCESS_(FINE|COARSE)_LOCATION/);
  });
});

describe('paisInicial con preferencias reales (expo-sqlite/kv-store simulado)', () => {
  function cargar(guardado: string | null | Error) {
    let mod!: typeof import('../region');
    jest.isolateModules(() => {
      jest.dontMock('../preferencias');
      jest.doMock('expo-sqlite/kv-store', () => ({
        __esModule: true,
        default: {
          getItemSync: (clave: string) => {
            if (guardado instanceof Error) throw guardado;
            return clave === 'preferencias.pais' ? guardado : null;
          },
          setItemAsync: () => Promise.resolve(),
        },
      }));
      mod = require('../region');
    });
    return mod;
  }

  test('país guardado "ES" manda sobre la región CL', () => {
    mockGetLocales.mockReturnValue([loc('CL')]);
    expect(cargar('ES').paisInicial()).toBe('ES');
  });

  test('sin guardado → región del sistema', () => {
    mockGetLocales.mockReturnValue([loc('CL')]);
    expect(cargar(null).paisInicial()).toBe('CL');
  });

  test('valor guardado inválido o almacenamiento que falla → región del sistema', () => {
    mockGetLocales.mockReturnValue([loc('US')]);
    expect(cargar('chile').paisInicial()).toBe('US');
    expect(cargar(new Error('sqlite')).paisInicial()).toBe('US');
  });
});
