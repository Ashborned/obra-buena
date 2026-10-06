# Guía de movimiento

Regla madre: **espectáculo en las recompensas, calma en la oración.**
Todo respeta "Reducir movimiento" del sistema: si está activo, se reemplaza por un fundido simple.
Herramientas: Reanimated para transiciones y gestos, Skia para lo dibujado. Objetivo: 60 fps en un Android de gama media.

## Nivel 1 · Espectáculo (momentos de recompensa)

| Momento | Qué pasa | Duración |
|---|---|---|
| Abrir la app | El vitral se arma celda por celda desde el centro, la luz entra en diagonal, el halo se enciende | 1.2 s, una vez por día |
| Encender una vela | La llama nace (escala 0 → 1 con rebote), destello cálido alrededor, partículas de chispa que suben | 0.7 s |
| Novena completa (9/9) | Las 9 llamas laten juntas, sube una columna de luz | 1.5 s |
| Día de la fiesta ("Hoy es su fiesta") | Trato de celebración en la novena; si la completó, las 9 velas aparecen encendidas. Sin puntos ni confeti | al abrir la novena ese día |
| Descubrir un rasgo | El aviso entra desde el costado con rebote, el ícono gira y brilla, vibración suave | 0.45 s entrada, 4 s visible |
| Ganar una medalla | La medalla se acuña: gira en 3D desde lejos, rayos dorados giran detrás, partículas doradas, vibración | 1.1 s |
| Medalla en la vitrina | Se puede girar con el dedo (gesto), refleja la luz según el ángulo | interactivo |
| Completar una colección | Las medallas de la colección se ordenan en arco y aparece la medalla de la colección | 2 s |

## Nivel 2 · Vida (ambiente, siempre sutil)

- Haz de luz que recorre el vitral (11 s, ida y vuelta).
- Halo que gira muy lento (40 s por vuelta).
- Llamas que titilan con duraciones distintas para que no se sincronicen.
- Cielo que cambia de color con la hora (transición de 0.6 s al cruzar de Laudes a Vísperas o Completas).
- Brillo que cruza el botón "¿Cómo te sientes hoy?" cada 5.5 s.
- Inclinar el teléfono mueve levemente la luz del vitral (giroscopio, opcional).

## Nivel 3 · Calma (oración y lectura)

- Versículo, oración, evangelio e historias: aparecen con fundido y subida de 10 px, nada más.
- Sin partículas, sin rebotes, sin sonidos mientras se lee o reza.
- Cambio de pestaña: fundido cruzado 200 ms.

## Prohibido

- Animar texto que se está leyendo.
- Celebrar acciones de oración con confeti o puntos.
- Movimientos infinitos que distraigan en pantallas de oración (Emociones, detalle de novena, lector).
