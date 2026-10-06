# Guía de movimiento

Regla madre: **espectáculo en las recompensas, calma en la oración.**
Todo respeta "Reducir movimiento" (del sistema **o** Configuración → Animaciones: Reducidas): si está activo, se reemplaza por un fundido simple y no vibra nada.
Herramientas: Reanimated para transiciones y gestos, Skia para lo dibujado. Objetivo: 60 fps en un Android de gama media.

## Tokens

Todas las duraciones, curvas y resortes viven en `app/src/theme/movimiento.ts` (`movimiento`, `curvas`, `resortes` y los atajos `tiempo`, `entradaCalma`, `fundido`). Ningún componente escribe una duración, una curva (`Easing.`) ni un resorte (`damping`) suelto; si falta uno, se agrega allí con su comentario. La vibración pasa por `useVibracion()` de `app/src/lib/vibracion.ts`; "Reducir movimiento" se lee con `useReducirMovimiento()` de `app/src/lib/animaciones.tsx`. Lo vigila `app/src/__tests__/movimiento-sistema.test.ts`.

Reglas de implementación: todo en el hilo de UI (shared values y worklets, nada de setState por cuadro, sin `setTimeout` para esperar una animación: `withDelay` con callback); los bucles se detienen al perder el foco; dentro de un `<Canvas>` no se leen contextos de React.

## Nivel 1 · Espectáculo (momentos de recompensa)

| Momento | Qué pasa | Duración |
|---|---|---|
| Abrir la app | El vitral se arma celda por celda desde el centro, la luz entra en diagonal, el halo se enciende | 1.2 s, una vez por día |
| Encender una vela | La llama nace (escala 0 → 1 con rebote), destello cálido alrededor, partículas de chispa que suben, vibración blanda | 0.7 s |
| Novena completa (9/9) | Las 9 llamas laten juntas (dos latidos), sube una columna de luz con una punta luminosa, vibración. Termina: nada queda en bucle | 1.5 s |
| Día de la fiesta ("Hoy es su fiesta") | Trato de celebración en la novena; si la completó, las 9 velas aparecen encendidas. Sin puntos ni confeti | al abrir la novena ese día |
| Descubrir un rasgo | El aviso entra desde el costado con rebote, el ícono gira y brilla, vibración suave | 0.45 s entrada, 4 s visible |
| Ganar una medalla | La medalla se acuña: gira en 3D desde lejos, rayos dorados giran detrás, partículas doradas, vibración | 1.1 s |
| Medalla en la vitrina | Se puede girar con el dedo (gesto); el reflejo sigue el ángulo en los dos ejes y se intensifica; vibra leve al llegar al giro máximo | interactivo |
| Completar una colección | Las medallas de la colección se ordenan en arco y aparece la medalla de la colección con un resplandor dorado que se abre y se apaga, vibración | 2 s |
| Medalla → vitrina | Al tocar "Ver tu vitrina", la medalla se levanta, vuela en arco girando una vez hasta su casilla y se asienta con un rebote | 0.9 s |

## Nivel 2 · Vida (ambiente, siempre sutil)

- Haz de luz que recorre el vitral (11 s, ida y vuelta).
- Halo que gira muy lento (40 s por vuelta).
- Llamas que titilan con duraciones distintas para que no se sincronicen.
- Cielo que cambia de color con la hora (transición de 0.6 s al cruzar de Laudes a Vísperas o Completas).
- Brillo que cruza el botón "¿Cómo te sientes hoy?" cada 5.5 s.
- Inclinar el teléfono mueve levemente la luz del vitral (opcional, Configuración → Apariencia; apagado por defecto). Sensor de gravedad de Reanimated, sin permisos, solo con el vitral de Hoy a la vista. El haz se corre unos pocos puntos y el halo unos grados.
- Todo lo de este nivel se detiene al perder el foco y nunca aparece en pantallas de oración.

## Nivel 3 · Calma (oración y lectura)

- Versículo, oración, evangelio e historias: aparecen con fundido y subida de 10 px, nada más.
- Sin partículas, sin rebotes, sin sonidos mientras se lee o reza.
- Cambio de pestaña: fundido cruzado 200 ms.
- "Otra oración" en una emoción y el cambio de día en una novena: fundido cruzado, sin moverse.
- Tarjeta del santo → su historia: el bloque del santo se expande como una hoja de vidrio y la historia entra con fundido (0.32 s + 0.32 s). Con movimiento reducido, solo el fundido.
- En el lector, el aviso de un rasgo sí rebota (es una recompensa de Aprender), pero el texto que se lee nunca se anima.
- Pantalla de carga: se desvanece en 400 ms (`movimiento.salidaCarga`) sobre la primera pantalla. Con movimiento reducido, corte directo (sin fundido).
- Pantallas de oración (Emociones y su detalle, detalle de novena, lector, evangelio, historia del santo): solo fundido + subida de 10 px; sin infinitos, sin partículas, sin rebotes. Las velas grandes de la novena quedan quietas una vez encendidas.

## Prohibido

- Animar texto que se está leyendo.
- Celebrar acciones de oración con confeti o puntos.
- Movimientos infinitos que distraigan en pantallas de oración (Emociones, detalle de novena, lector).
