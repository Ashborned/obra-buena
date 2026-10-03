/**
 * País de la persona en toda la app (CLAUDE.md, principios 6 y 8; docs/decisiones.md, 2026-10-02/03).
 *
 * - Arranca con `paisInicial()`: el país guardado manda sobre la región del teléfono.
 * - Puede ser `null`: el teléfono no informa región o la persona prefirió no decirlo.
 *   Entonces la ayuda usa el respaldo (Find A Helpline + aviso de emergencias local).
 * - Se guarda en el teléfono al cambiarlo; nunca sale de él. No se pide permiso de ubicación.
 *
 * "Prefiero no decirlo" se guarda como `ZZ` (código ISO 3166 de uso privado que CLDR usa para
 * "región desconocida"): así la elección sobrevive al reinicio y no vuelve a mandar la región del
 * teléfono. Hacia afuera siempre se expone como `null`.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { contenido, type CodigoPais } from '@/contenido';
import { useIdioma } from '@/i18n';

import { nombrePais } from './paises';
import { guardarPais } from './preferencias';
import { paisInicial } from './region';

export const PAIS_SIN_DECIR = 'ZZ';

export type ContextoPais = {
  pais: CodigoPais | null;
  setPais: (pais: CodigoPais | null) => void;
};

const Contexto = createContext<ContextoPais | null>(null);

function desdeGuardado(valor: string | null): CodigoPais | null {
  return valor === PAIS_SIN_DECIR ? null : valor;
}

export function PaisProvider({ children }: { children: ReactNode }) {
  const [pais, setPaisEstado] = useState<CodigoPais | null>(() => desdeGuardado(paisInicial()));

  const setPais = useCallback((nuevo: CodigoPais | null) => {
    setPaisEstado(nuevo);
    guardarPais(nuevo ?? PAIS_SIN_DECIR);
  }, []);

  const valor = useMemo(() => ({ pais, setPais }), [pais, setPais]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePais(): ContextoPais {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('usePais() debe usarse dentro de <PaisProvider>.');
  return ctx;
}

/** Nombre de un país en el idioma actual de la interfaz (se actualiza al cambiar de idioma). */
export function useNombrePais(): (codigo: CodigoPais) => string {
  const idioma = useIdioma();
  return useCallback((codigo: CodigoPais) => nombrePais(codigo, idioma, contenido.ayuda), [idioma]);
}
