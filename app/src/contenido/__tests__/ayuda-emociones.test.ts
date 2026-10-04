/// <reference types="jest" />
/*
 * Ayuda por país para Depresión, Triste y Soledad (CLAUDE.md, principio 6; principio 7 para
 * producción). Complementa ayuda.test.ts con los países y casos que pide la pestaña Emociones.
 */
import datos from '../../../../content/contenido.json';
import { EMOCIONES_CON_AYUDA, muestraAyuda } from '@/lib/emociones';
import { prepararLlamada } from '@/lib/llamar';

import { ayudaParaPais, type AyudaElegida } from '../ayuda';
import { filtrarPorRevision } from '../filtro';
import type { Ayuda, Contenido } from '../tipos';

const real = datos as unknown as Contenido;
const dev = filtrarPorRevision(real, 'desarrollo');
const prod = filtrarPorRevision(real, 'produccion');

const CON_DATOS = ['CL', 'US', 'ES', 'GB', 'IE', 'AR'];
const SIN_DATOS: (string | null)[] = ['FR', 'JP', null, 'ZZ'];

function esRespaldoValido(r: AyudaElegida) {
  expect(r.tipo).toBe('respaldo');
  expect(r).not.toHaveProperty('pais.lineas');
  expect(new URL(r.respaldo.url).hostname).toMatch(/(^|\.)findahelpline\.com$/);
  expect(r.respaldo.nombre.es.length).toBeGreaterThan(0);
  expect(r.respaldo.nombre.en.length).toBeGreaterThan(0);
  expect(r.respaldo.nota.es).toMatch(/emergencias/i);
  expect(r.respaldo.nota.en).toMatch(/emergency/i);
}

describe('desarrollo: países con datos', () => {
  test.each(CON_DATOS)('%s → tipo país con sus líneas y ningún marcar de otro país', (codigo) => {
    const r = ayudaParaPais(dev.ayuda, codigo);
    expect(r.tipo).toBe('pais');
    if (r.tipo !== 'pais') return;
    expect(r.pais.pais).toBe(codigo);
    const propias = real.ayuda.paises.find((p) => p.pais === codigo)!.lineas;
    expect(r.pais.lineas).toEqual(propias);
    const propiosMarcar = new Set(propias.map((l) => l.marcar));
    const ajenos = real.ayuda.paises
      .filter((p) => p.pais !== codigo)
      .flatMap((p) => p.lineas.map((l) => l.marcar))
      .filter((m) => !propiosMarcar.has(m)); // GB e IE comparten 116 123 (Samaritans) legítimamente
    for (const l of r.pais.lineas) expect(ajenos).not.toContain(l.marcar);
  });

  test('los países de la tarea existen en el contenido', () => {
    const hay = real.ayuda.paises.map((p) => p.pais);
    for (const c of CON_DATOS) expect(hay).toContain(c);
  });
});

describe('desarrollo: país sin datos → respaldo Find A Helpline', () => {
  test.each(SIN_DATOS)('%p → respaldo con nota de emergencias es/en', (codigo) => {
    esRespaldoValido(ayudaParaPais(dev.ayuda, codigo));
  });
});

describe('producción', () => {
  test('hoy todos los países están sin aprobar → todos caen al respaldo', () => {
    // Si algún país se aprueba, esta prueba avisa para revisar el caso.
    expect(real.ayuda.paises.filter((p) => p.revision === 'aprobado').map((p) => p.pais)).toEqual([]);
    for (const c of [...CON_DATOS, ...SIN_DATOS]) esRespaldoValido(ayudaParaPais(prod.ayuda, c));
  });

  test('fixture: CL aprobado y US no → CL país, US respaldo (nunca el número sin verificar)', () => {
    const cl = real.ayuda.paises.find((p) => p.pais === 'CL')!;
    const us = real.ayuda.paises.find((p) => p.pais === 'US')!;
    const fix: Ayuda = {
      respaldo: real.ayuda.respaldo,
      paises: [
        { ...cl, revision: 'aprobado' },
        { ...us, revision: 'pendiente' },
      ],
    };
    const c = filtrarPorRevision({ ...real, ayuda: fix }, 'produccion').ayuda;
    const rCL = ayudaParaPais(c, 'CL');
    expect(rCL.tipo).toBe('pais');
    if (rCL.tipo === 'pais') expect(rCL.pais.lineas).toEqual(cl.lineas);
    esRespaldoValido(ayudaParaPais(c, 'US'));
    esRespaldoValido(ayudaParaPais(c, 'FR'));
  });
});

describe('Depresión, Triste y Soledad siempre tienen algo que mostrar', () => {
  const casos: [string, Ayuda][] = [
    ['desarrollo', dev.ayuda],
    ['producción', prod.ayuda],
  ];

  test.each(casos)('%s: con CL, FR, null, undefined y basura nunca devuelve undefined', (_m, ayuda) => {
    for (const c of ['CL', 'FR', null, undefined, '', 'xx-YY']) {
      const r = ayudaParaPais(ayuda, c as string | null | undefined);
      expect(r).toBeDefined();
      expect(['pais', 'respaldo']).toContain(r.tipo);
      expect(r.respaldo.url).toBeTruthy();
      if (r.tipo === 'pais') expect(r.pais.lineas.length).toBeGreaterThan(0);
    }
  });

  test('las tres emociones existen y muestran ayuda en desarrollo y producción', () => {
    for (const c of [dev, prod]) {
      for (const id of EMOCIONES_CON_AYUDA) {
        const em = c.emociones.find((e) => e.id === id);
        expect(em).toBeDefined();
        expect(muestraAyuda(em!)).toBe(true);
      }
    }
  });

  test('todas las líneas del contenido se pueden marcar en Android', () => {
    for (const p of real.ayuda.paises) {
      for (const l of p.lineas) expect(prepararLlamada(l.marcar, 'android').tipo).toBe('marcador');
    }
  });
});
