/**
 * Proveedor del tema: paleta elegida, preferencia de hora y tokens resueltos.
 *
 * La paleta y la preferencia de hora se leen de forma síncrona del almacenamiento local al crear
 * el proveedor (sin parpadeo de la paleta por defecto) y se guardan al cambiarlas
 * (ver `@/lib/preferencias`).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import {
  horaEfectiva,
  horaSegunReloj,
  type HoraOracion,
  type PreferenciaHora,
} from '@/lib/hora-oracion';
import {
  guardarPaleta,
  guardarPreferenciaHora,
  leerPaleta,
  leerPreferenciaHora,
} from '@/lib/preferencias';

import type { PaletaId } from './paletas';
import { msHastaProximoCambio } from './reloj';
import { resolverTema, type TemaResuelto } from './resolver';

/** Intervalo máximo entre revisiones del reloj (evita temporizadores largos en Android). */
const REVISION_MAXIMA_MS = 60_000;

export type ContextoTema = TemaResuelto & {
  preferenciaHora: PreferenciaHora;
  setPaleta: (id: PaletaId) => void;
  setPreferenciaHora: (pref: PreferenciaHora) => void;
};

const Contexto = createContext<ContextoTema | null>(null);

/** Hora del reloj que se mantiene al día al cruzar 05:00 / 12:00 / 20:00 y al volver a la app. */
function useHoraDelReloj(activo: boolean): HoraOracion {
  const [hora, setHora] = useState<HoraOracion>(() => horaSegunReloj());

  useEffect(() => {
    if (!activo) return;
    let temporizador: ReturnType<typeof setTimeout>;

    const revisar = () => {
      setHora(horaSegunReloj());
      temporizador = setTimeout(revisar, Math.min(msHastaProximoCambio(), REVISION_MAXIMA_MS));
    };
    revisar();

    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') setHora(horaSegunReloj());
    });

    return () => {
      clearTimeout(temporizador);
      sub.remove();
    };
  }, [activo]);

  return hora;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [paletaId, setPaletaEstado] = useState<PaletaId>(leerPaleta);
  const [preferenciaHora, setPreferenciaHoraEstado] = useState<PreferenciaHora>(leerPreferenciaHora);

  const setPaleta = useCallback((id: PaletaId) => {
    setPaletaEstado(id);
    guardarPaleta(id);
  }, []);

  const setPreferenciaHora = useCallback((pref: PreferenciaHora) => {
    setPreferenciaHoraEstado(pref);
    guardarPreferenciaHora(pref);
  }, []);

  const horaReloj = useHoraDelReloj(preferenciaHora === 'auto');
  const hora = preferenciaHora === 'auto' ? horaReloj : horaEfectiva(preferenciaHora);

  const valor = useMemo<ContextoTema>(
    () => ({
      ...resolverTema(paletaId, hora),
      preferenciaHora,
      setPaleta,
      setPreferenciaHora,
    }),
    [paletaId, hora, preferenciaHora, setPaleta, setPreferenciaHora],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema(): ContextoTema {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useTema() debe usarse dentro de <ThemeProvider>.');
  return ctx;
}
