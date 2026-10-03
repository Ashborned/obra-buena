/**
 * Fecha de hoy y hora de oración del reloj como valores reactivos. Cambian solos al pasar la
 * medianoche y al cruzar 05:00 / 12:00 / 20:00, y se revisan al volver a la app.
 *
 * La hora es la del RELOJ (`horaDeOracion`), no la del tema: si la persona fijó una hora en
 * Configuración, el cielo sigue esa preferencia, pero Hoy nombra el oficio real del momento.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { msHastaProximoCambio } from '@/theme/reloj';

import type { HoraOracion } from './hora-oracion';
import { horaDeOracion } from './hoy';
import { inicioDelDia, sumarDias } from './novenas';

/** Intervalo máximo entre revisiones (evita temporizadores largos en Android). */
const REVISION_MAXIMA_MS = 60_000;

export type Ahora = {
  /** Medianoche local de hoy. */
  hoy: Date;
  /** Hora de oración según el reloj. */
  hora: HoraOracion;
};

function leerAhora(): Ahora {
  const ahora = new Date();
  return { hoy: inicioDelDia(ahora), hora: horaDeOracion(ahora) };
}

export function useAhora(): Ahora {
  const [valor, setValor] = useState(leerAhora);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;
    const actualizar = () => {
      const nuevo = leerAhora();
      // Solo cambia el estado si cambió el día o la hora (Hoy no se vuelve a dibujar cada minuto).
      setValor((previo) =>
        previo.hoy.getTime() === nuevo.hoy.getTime() && previo.hora === nuevo.hora ? previo : nuevo,
      );
    };
    const revisar = () => {
      actualizar();
      const hastaManana = sumarDias(new Date(), 1).getTime() - Date.now();
      const espera = Math.min(hastaManana, msHastaProximoCambio(), REVISION_MAXIMA_MS);
      temporizador = setTimeout(revisar, Math.max(espera, 1000));
    };
    revisar();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') actualizar();
    });
    return () => {
      clearTimeout(temporizador);
      sub.remove();
    };
  }, []);

  return valor;
}
