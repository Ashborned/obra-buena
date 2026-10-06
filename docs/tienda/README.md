# Ficha de la tienda (Google Play primero)

- Textos: `es/ficha.md` y `en/ficha.md`. Validar con `node scripts/validar-tienda.mjs`.
- Ícono 512 y gráfico destacado: se generan desde `assets/marca/` con `npm run marca` (raíz).
- Capturas: `es/capturas/` y `en/capturas/`.

## Nombre en la tienda (decidido por Felipe, 2026-10-06)

| Idioma | Título | Caracteres |
|---|---|---|
| en-US | Soul Shelter: Catholic Prayer | 29 |
| es-419 / es-ES | Soul Shelter: Oración católica | 30 |

Reemplaza a "Soul Shelter - Bible". Motivo: la política de metadatos de Play prohíbe palabras clave
engañosas o irrelevantes. La app cita versículos pero no es una Biblia (no hay lectura de la Biblia
completa), así que "Bible" en el título arriesgaba un rechazo en la revisión y reseñas de quien buscaba
una Biblia. El nombre de la app en el teléfono sigue siendo "Soul Shelter".

## Reglas de los textos

- Tono cálido. Sin promesas de salud mental ni de resultados espirituales.
- Sin superlativos, rankings ("#1", "la mejor") ni comparaciones con otras apps. Sin emojis ni mayúsculas
  sostenidas en el título.
- Decir lo que la diferencia: entrada por emoción, novenas con fecha real, sin cuentas, sin anuncios,
  nada sale del teléfono.
- Español neutro, sin suponer país ni género.
- Solo describir lo que la app hace **en la versión que se publica**.

### Antes de publicar, revisar

- **Evangelio:** la ficha dice que Hoy muestra el evangelio. Hoy la app tiene solo un evangelio de ejemplo
  (pendientes 3 y 4 de `docs/decisiones.md`). Si al publicar no hay fuente diaria, quitar "el evangelio"
  de la sección HOY en ambos idiomas.
- **Santo del día:** igual: si el contenido no cubre todo el año, no prometer "cada día".
- **Ayuda por país:** la frase sobre ayuda describe la tarjeta (líneas verificadas o Find A Helpline);
  no promete atención ni resultados.

## Requisitos vigentes de Play (revisados el 2026-10-06)

Fuentes: [Recursos de vista previa](https://support.google.com/googleplay/android-developer/answer/9866151),
[Metadatos](https://support.google.com/googleplay/android-developer/answer/9898842).

| Recurso | Requisito |
|---|---|
| Título | ≤ 30 caracteres; sin emojis; sin rendimiento, ranking, precio ni promociones |
| Descripción breve | ≤ 80 caracteres |
| Descripción completa | ≤ 4000 caracteres; sin listas de palabras clave ni testimonios sin atribución |
| Ícono | PNG 32 bits (con alfa), 512 × 512, ≤ 1024 KB |
| Gráfico destacado | JPEG o PNG 24 bits (sin alfa), 1024 × 500 |
| Capturas de teléfono | Mínimo 2 (máximo 8); JPEG o PNG 24 bits sin alfa; lados entre 320 y 3840 px; el lado mayor no puede superar el doble del menor |
| Para recomendaciones destacadas | Al menos 4 capturas de ≥ 1080 px, en 9:16 vertical (mín. 1080 × 1920) |

El emulador mide 1080 × 2400 (2,22:1): **no cumple**. Las capturas se toman con la pantalla del emulador
cambiada temporalmente a 1080 × 1920 (`adb shell wm size 1080x1920`, luego `wm size reset`), así la app se
dibuja de verdad en 9:16 y no hay que recortar.

## Escenas (es y en, paleta Rosa mística, hora Laudes)

Fecha del emulador: 1 de octubre (Santa Teresita del Niño Jesús, con santo del día en el contenido y la
novena de San Bruno en curso). Todo el contenido sale de `content/contenido.json`; nada inventado.

| # | Escena | Pantalla | Qué muestra |
|---|---|---|---|
| 1 | Hoy | `(tabs)/index` | Vitral de Santa Teresita, color litúrgico, novena en curso, botón "¿Cómo te sientes hoy?" |
| 2 | Emociones | `(tabs)/emociones` | Las 12 emociones |
| 3 | Una emoción | `emocion/tired` | Versículo, oración y santo compañero (no se usa una emoción de crisis) |
| 4 | Novenas | `(tabs)/novenas` | Lista con fechas reales y velas |
| 5 | Detalle de novena | `novena/bru` | Velas encendidas de los días rezados |
| 6 | Aprender | `(tabs)/aprender` | Colecciones y vitrina con una medalla |
| 7 | Medalla | `medalla/[id]` | La medalla grande |
| 8 | Configuración | `configuracion` | Paleta, idioma, letra, animaciones |

Barra de estado en modo demo (hora 9:41, batería llena, sin notificaciones). Sin el menú de desarrollo
de Expo Go a la vista.

## Seguridad de los datos (borrador para el hito 12)

Según `docs/red.md` (la app no hace peticiones de red propias). Lo que respondería en Play Console:

| Pregunta | Respuesta propuesta | Motivo |
|---|---|---|
| ¿La app recopila o comparte alguno de los tipos de datos del usuario requeridos? | No | Nada sale del teléfono: sin servidor, sin analítica, sin informes de errores, sin anuncios |
| ¿Los datos se encriptan en tránsito? | No aplica (no se transmiten datos) | — |
| ¿Se pueden solicitar eliminaciones? | Sí, en la app: Configuración → Privacidad → "Borrar mis datos" | Todo está en el teléfono |
| Compras (`expo-iap`) | La tienda procesa el pago; la app no recibe datos de pago | Revisar en el hito 12 si Play pide declarar "historial de compras" |
| Recordatorios | Notificaciones locales, sin token de push | — |

La política de privacidad y la declaración definitiva son del hito 12.
