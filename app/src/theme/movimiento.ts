/**
 * Sistema de movimiento (docs/guia-movimiento.md): la única fuente de duraciones, curvas y resortes.
 * Ningún componente escribe números de animación sueltos; los toma de aquí para que todo se sienta
 * de la misma familia.
 *
 * - `movimiento`: duraciones (ms) por momento, agrupadas por nivel.
 * - `curvas`: las curvas de la app. Cada una tiene un uso; si un momento nuevo no encaja, se agrega aquí.
 * - `resortes`: configuraciones de `withSpring`.
 * - `entradaCalma`, `fundido`, `tiempo`: atajos ya resueltos con "Reducir movimiento".
 *
 * "Reducir movimiento" (sistema **o** Configuración → Animaciones: Reducidas) se lee con
 * `useReducirMovimiento()` de `@/lib/animaciones`; la vibración, con `useVibracion()` de `@/lib/vibracion`.
 * Con movimiento reducido todo queda en fundidos de `movimiento.fundido` y sin vibración.
 */
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  ReduceMotion,
  type EasingFunction,
  type EasingFunctionFactory,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

export const movimiento = {
  // --- Nivel 1 · Espectáculo (recompensas) ---------------------------------------------------------
  /** El vitral se arma, entra la luz y se enciende el halo (una vez por día). */
  aperturaVitral: 1200,
  /** La llama nace con rebote y destello al encender una vela. */
  encenderVela: 700,
  /** Chispas que suben al encender una vela (un poco más largas que la llama). */
  chispasVela: 900,
  /** Novena completa (9/9): las llamas laten juntas y sube una columna de luz. */
  novenaCompleta: 1500,
  /** La novena completa espera a que la novena llama termine de nacer (≈ 60 % de `encenderVela`). */
  novenaCompletaRetraso: 420,
  /** Latidos de las nueve llamas dentro de `novenaCompleta` (cada uno: sube y baja). */
  latidosNovena: 2,
  /** El aviso de rasgo entra desde el costado con rebote. */
  avisoRasgoEntrada: 450,
  /** El aviso de rasgo se cierra solo (desde que aparece). */
  avisoRasgoVisible: 4000,
  /** El ícono del rasgo gira y brilla al entrar. */
  giroIconoRasgo: 700,
  /** La medalla se acuña (giro 3D desde lejos). */
  acunarMedalla: 1100,
  /** Partículas doradas al acuñar. */
  particulasMedalla: 1400,
  /** Los rayos giran detrás de la medalla y se detienen (no es infinito). */
  rayosMedalla: 6000,
  /** Los rayos aparecen un poco después que la medalla (maqueta: 0.4 s). */
  rayosMedallaRetraso: 400,
  /** Las partículas saltan cuando la medalla llega. */
  particulasMedallaRetraso: 350,
  /** Colección completa: las medallas se ordenan en arco y aparece la de la colección. */
  coleccionCompleta: 2000,
  /** Colección completa: resplandor que se abre detrás de la medalla de la colección y se apaga. */
  resplandorColeccion: 1400,
  /** Medalla en la vitrina: regreso al soltarla (sin rebote con "Reducir movimiento"). */
  regresoMedalla: 250,
  /** La medalla viaja del resultado del quiz a su lugar en la vitrina. */
  vueloMedalla: 900,
  /** Si la vitrina no aparece a tiempo, la medalla en vuelo se desvanece (no se queda flotando). */
  vueloMedallaEspera: 1600,

  // --- Nivel 2 · Vida (ambiente, siempre sutil; nunca en pantallas de oración) ---------------------
  /** Haz de luz que recorre el vitral, ida y vuelta (cada tramo). */
  haz: 11_000,
  /** Una vuelta del halo. */
  halo: 40_000,
  /** Ciclo del brillo que cruza "¿Cómo te sientes hoy?". */
  brilloLlamada: 5500,
  /** Titileo de estrellas (tres grupos desfasados). */
  estrellas: [3200, 4300, 5600] as const,
  /** Titileo de llamas (duraciones distintas para no sincronizarse, como la maqueta). */
  llamas: [1900, 2300, 1600] as const,
  /** Cielo al cruzar de una hora de oración a otra. */
  cambioCielo: 600,
  /** La luz del vitral sigue la inclinación del teléfono (suavizado del seguimiento). */
  inclinacion: 900,
  /** El "centro" de la inclinación se acomoda a cómo sostienes el teléfono (muy lento). */
  inclinacionCentro: 4000,

  // --- Nivel 3 · Calma (oración y lectura) y transiciones --------------------------------------------
  /** Fundido + subida de 10 px. */
  entradaCalma: 350,
  subidaCalma: 10,
  /** Retraso entre bloques que entran uno tras otro (la maqueta: 0.05 s). */
  escalonCalma: 50,
  /** Cambio de pestaña: fundido cruzado. */
  cambioPestana: 200,
  /** Pantalla que se abre sobre otra (tarjeta → historia, resultado → vitrina). */
  cambioPantalla: 320,
  /** La pantalla de carga se desvanece sobre la primera pantalla (sin fundido con movimiento reducido). */
  salidaCarga: 400,
  /** Fundido cruzado dentro de una pantalla de oración ("Otra oración"): entra lo nuevo… */
  cruceEntrada: 320,
  /** …y se va lo anterior, un poco antes. */
  cruceSalida: 200,
  /** Apagar una vela: fundido simple, sin celebración. */
  apagarVela: 300,
  /** Respuesta al tocar (botones, tarjetas); también el último fundido de una transición compartida. */
  toque: 120,

  // --- Movimiento reducido -------------------------------------------------------------------------
  /** Con "Reducir movimiento": solo fundidos, siempre de esta duración. */
  fundido: 400,
} as const;

/**
 * Curvas. Los nombres dicen el gesto, no la fórmula:
 * - `calma`: entra y se asienta sin prisa (textos, tarjetas, pantallas).
 * - `salida`: arranca rápido y frena (lo que aparece por una acción de la persona).
 * - `suave`: salida más leve (regresos, desvanecidos de partículas).
 * - `vaiven`: ida y vuelta del ambiente (haz, llamas, estrellas, brillo).
 * - `pulso`: un latido corto (columna de luz de la novena completa).
 * - `cae`: arranca lento y acelera (la bajada de cada latido de las llamas).
 * - `rebote`: se pasa un poco y vuelve (la llama que nace).
 * - `acunar`: rebote más contenido (la medalla que llega).
 * - `giro`: gira y se pasa apenas (ícono del rasgo).
 * - `lineal`: progresos que otra curva reparte (apertura del vitral, rotación del halo).
 */
export const curvas = {
  calma: Easing.bezier(0.22, 1, 0.36, 1),
  salida: Easing.out(Easing.cubic),
  suave: Easing.out(Easing.quad),
  vaiven: Easing.inOut(Easing.sin),
  pulso: Easing.inOut(Easing.quad),
  cae: Easing.in(Easing.quad),
  rebote: Easing.bezier(0.2, 1.6, 0.4, 1),
  acunar: Easing.bezier(0.2, 1.3, 0.3, 1),
  giro: Easing.out(Easing.back(1.4)),
  lineal: Easing.linear,
} satisfies Record<string, EasingFunction | EasingFunctionFactory>;

/**
 * Resortes. `reduceMotion` lo decide quien llama: con movimiento reducido no se usa resorte, se usa
 * `tiempo(movimiento.fundido)` (sin rebote).
 * - `rebote`: vivo, para lo que se suelta con el dedo (medalla en la vitrina).
 * - `firme`: llega rápido casi sin pasarse (avisos, fichas que se acomodan).
 * - `suave`: lento y amplio (la medalla que viaja, el arco de la colección).
 * - `aviso`: entra desde el costado y se pasa apenas (el aviso de rasgo).
 */
export const resortes = {
  rebote: { damping: 9, stiffness: 120, mass: 1 },
  firme: { damping: 18, stiffness: 220, mass: 1 },
  suave: { damping: 20, stiffness: 90, mass: 1 },
  aviso: { damping: 14, stiffness: 140, mass: 0.8 },
} as const satisfies Record<string, WithSpringConfig>;

/** Configuración de `withTiming` con una curva del sistema (por defecto, `calma`). */
export function tiempo(
  duracion: number,
  curva: EasingFunction | EasingFunctionFactory = curvas.calma,
): WithTimingConfig {
  return { duration: duracion, easing: curva };
}

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
    .easing(curvas.calma)
    .withInitialValues({ opacity: 0, transform: [{ translateY: movimiento.subidaCalma }] });
}

/**
 * Fundido de entrada y salida que **siempre** ocurre (también con movimiento reducido, que es su
 * reemplazo). Úsese para lo que con "Reducir movimiento" debe seguir apareciendo suave.
 */
export const fundido = {
  entrada: (duracion: number = movimiento.fundido) =>
    FadeIn.duration(duracion).reduceMotion(ReduceMotion.Never),
  salida: (duracion: number = movimiento.fundido) =>
    FadeOut.duration(duracion).reduceMotion(ReduceMotion.Never),
};
