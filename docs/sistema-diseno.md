# Sistema de diseño

Fuente: `prototype/obra-buena.html`. Todos los colores salen de estos tokens; ningún componente usa colores sueltos.

## Concepto

**La luz.** Cómo entra por un vitral, cómo cambia durante el día y cómo arde una vela.

## Paletas (elegibles en Configuración)

| Token | Rosa mística (por defecto) | Vitral |
|---|---|---|
| `primary` (p) | `#7B55C9` lila | `#1B2A8C` azul mariano |
| `primaryDeep` (pd) | `#34264F` | `#0D1452` |
| `glow` (g) | `#F28CB6` rosado | `#F5C542` dorado |
| `glowSoft` (g2) | `#FFD3E4` | `#FFE08A` |
| `ink` | `#2A2531` grafito | `#10111F` |
| `onGlow` (gink) | `#17130A` | `#17130A` |

Colores del vitral generativo:
- Rosa mística: `#7B55C9 #A684E6 #C9A6FF #5D3FA0 #B98AE0 #F28CB6 #F7B3CF #FFD3E4`
- Vitral: `#1B2A8C #22379E #2C4BC0 #0F1A66 #3A6FD0 #F5C542 #E8A91C #B3264A`

## Hora de oración (cambia sola según el reloj; se puede fijar en Configuración)

| Modo | Horario | Nombre | Cielo |
|---|---|---|---|
| `day` | 05:00–11:59 | Laudes | glowSoft 60% + blanco, primary 16% + blanco, fondo `#FBFAF7` |
| `dusk` | 12:00–19:59 | Vísperas | glow 42% + durazno `#FFC3A6`, primary 32% + `#F2E4FF`, fondo `#FFF3EC` |
| `night` | 20:00–04:59 | Completas | primary 55% + `#0A0B1C`, primaryDeep 70% + `#1A0F2A`, fondo `#07081A`, estrellas, texto `#F4F2FB` |

De noche el acento (`accent`) pasa de `primary` a `glow`.

## Texto sobre el cielo (contraste AA, aprobado 2026-10-03)

La legibilidad manda: todo texto cumple AA (4.5:1) contra el punto más intenso del cielo.
Se parte del valor de la maqueta y se oscurece hacia `ink` solo lo necesario
(`asegurarContraste` en `app/src/theme/resolver.ts`). `primary` y `glow` siguen exactos para gráficos y superficies;
el texto pequeño en color de acento usa `acentoTexto`.

| Token | Rosa mística · Laudes | Rosa mística · Vísperas | Vitral · Laudes | Vitral · Vísperas | Completas (ambas) |
|---|---|---|---|---|---|
| `textoSuave` | `#6A6670` | `#504C57` | `#5E5F6B` | `#3E3F4C` | `#F4F2FB` al 66 % |
| `acentoTexto` | `#7652BF` | `#574285` | `#1B2A8C` | `#1B2A8C` | = `glow` |

La maqueta usa ink 60 % + blanco para el texto suave (4.39 y 4.21 en Rosa mística) y `primary` puro para la pestaña activa (4.26 y 4.07): **estos valores reemplazan a los de la maqueta**.
La pestaña activa también se ajusta a AA sobre su fondo (acento al 13 % sobre la barra).

## Colores litúrgicos (cinta del misal)

verde `#2F7D4F` · blanco `#F6EFDC` · rojo `#B3263A` · morado `#5B2A86` · rosado (Gaudete/Laetare) `#E39AB5`

## Emociones (tono por emoción, OKLCH, misma luminosidad para todas)

feliz 85 · cansada 250 · sanación 160 · depresión 280 · triste 235 · confundida 310 · enojo 30 · alegría 62 · soledad 205 · amor 8 · perdón 340 · gratitud 115.
Día: L 0.955/0.88, C 0.04/0.085. Noche: L 0.34/0.25, C 0.07/0.06.

## Semánticos

correcto `#2F9E5F` · incorrecto `#C23B4F`. No se usan como acento.

Borrar (Configuración → "Borrar mis datos"): `peligro` es `incorrecto` llevado a AA sobre cielo, vidrio y hoja (de día hacia `ink`, de noche hacia el texto claro); el botón que confirma usa `peligroFondo` = `incorrecto` con texto blanco (`sobrePeligro`). Hojas modales propias: velo `#0A0B1C` al 45 % (70 % de noche) y fondo opaco `hoja` = fondo del cielo.

## Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Display | Cormorant Garamond 600 / itálica 500 | Nombres de santos, títulos, citas |
| Lectura | Literata 400 | Texto largo en Aprender (tamaño ajustable 15–23 px) |
| Interfaz | Figtree 400–700 | Botones, etiquetas, cuerpo corto |
| Capitular | UnifrakturMaguntia | Solo la primera letra de una historia |

Etiquetas: Figtree 700, 10.5 px, mayúsculas, espaciado 0.14em.

## Superficies

- Tarjeta de vidrio: fondo translúcido (blanco 62% de día, `rgba(24,26,58,.55)` de noche), desenfoque 18, borde 1 px claro, radio 24.
- Barra de pestañas flotante, radio 26, más opaca que las tarjetas.
- Grano de película sobre toda la pantalla, opacidad 0.16.

## Componentes base

Vitral (hero), Ventana en arco, Halo, Cinta litúrgica, Chip, Tarjeta de vidrio, Botón dorado, Botón fantasma,
Vela (mini y grande), Mosaico de emoción, Tarjeta de compañero, Tarjeta de ayuda, Fila de novena,
Lector, Aviso de rasgo, Opción de quiz, Medalla, Vitrina, Carrusel de colección, Barra de pestañas.
