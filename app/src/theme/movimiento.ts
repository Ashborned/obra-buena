/**
 * Duraciones y entradas de docs/guia-movimiento.md, para no repetir números en los componentes.
 */
import { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';

export const movimiento = {
  /** Nivel 1: el vitral se arma, entra la luz y se enciende el halo (una vez por día). */
  aperturaVitral: 1200,
  /** Nivel 2: haz de luz que recorre el vitral, ida y vuelta (cada tramo). */
  haz: 11_000,
  /** Nivel 2: una vuelta del halo. */
  halo: 40_000,
  /** Nivel 2: ciclo del brillo que cruza "¿Cómo te sientes hoy?". */
  brilloLlamada: 5500,
  /** Nivel 2: titileo de estrellas (tres grupos desfasados). */
  estrellas: [3200, 4300, 5600] as const,
  /** Nivel 2: titileo de llamas (duraciones distintas para no sincronizarse, como la maqueta). */
  llamas: [1900, 2300, 1600] as const,
  /** Nivel 1: la llama nace con rebote y destello al encender una vela. */
  encenderVela: 700,
  /** Nivel 1: chispas que suben al encender una vela (un poco más largas que la llama). */
  chispasVela: 900,
  /** Nivel 1: novena completa (9/9): las llamas laten juntas y sube una columna de luz. */
  novenaCompleta: 1500,
  /** Apagar una vela: fundido simple, sin celebración. */
  apagarVela: 300,
  /** Nivel 3: fundido + subida de 10 px. */
  entradaCalma: 350,
  subidaCalma: 10,
  /** Retraso entre bloques que entran uno tras otro (la maqueta: 0.05 s). */
  escalonCalma: 50,
  /** Con "Reducir movimiento": solo fundidos. */
  fundido: 400,
} as const;

/**
 * Entrada de calma (nivel 3): fundido y subida de 10 px. Con "Reducir movimiento" queda solo el
 * fundido (y se fuerza `ReduceMotion.Never` para que Reanimated no la quite del todo).
 */
export function entradaCalma(reducirMovimiento: boolean, orden = 0) {
  const retraso = orden * movimiento.escalonCalma;
  if (reducirMovimiento) {
    return FadeIn.duration(movimiento.fundido).delay(retraso).reduceMotion(ReduceMotion.Never);
  }
  return FadeInDown.duration(movimiento.entradaCalma)
    .delay(retraso)
    .withInitialValues({ opacity: 0, transform: [{ translateY: movimiento.subidaCalma }] });
}
