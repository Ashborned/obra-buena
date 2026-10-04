# Decisiones

Registro de lo decidido y lo pendiente. Formato: fecha · decisión · motivo.
Nada que contradiga este archivo se implementa sin actualizarlo primero.

## Decidido

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-09-28 | Bilingüe español/inglés con selector | Pedido de la amiga |
| 2026-09-28 | Primero maqueta, luego app nativa | Validar diseño antes de programar |
| 2026-09-28 | Contenido diario automático desde fuentes en línea (santo, evangelio) | Que la app se mantenga sola |
| 2026-09-28 | Pantalla de inicio: el santo del día como protagonista | Feedback: "hay mucha información" |
| 2026-09-28 | Navegación por pestañas abajo | Una cosa por pantalla |
| 2026-09-29 | Diferenciación: entrada por emoción, novenas con fecha real, privada, gratis, bilingüe, contenido serio | Análisis de Hallow, Laudate, Ascension, Amen, Pray As You Go |
| 2026-09-29 | Emoción → versículo → oración → santo compañero | Conectar las secciones del boceto |
| 2026-09-29 | Ayuda real en Depresión, Triste y Soledad (*4141, Salud Responde) | Responsabilidad |
| 2026-09-29 | "Conocer su historia" abre una pantalla completa | Pedido de Felipe |
| 2026-09-29 | Dirección visual: luz (vitral generativo, cinta litúrgica, velas, letra capital, cielo según la hora de oración, vidrio esmerilado, grano) | Rediseño profesional |
| 2026-10-02 | La oración no da puntos. El juego vive solo en Aprender | No convertir la oración en producto |
| 2026-10-02 | Aprender: lectura → rasgos al leer → quiz de 5 alternativas → medalla → vitrina | Idea de Felipe y su amiga |
| 2026-10-02 | Aprender por colecciones (Apóstoles, Santos de Chile, Virgen María, Doctores) | Escalar sin listas infinitas |
| 2026-10-02 | Emociones rotan una entrada por día + botón "Otra oración" | Variedad sin cambiar dentro del día |
| 2026-10-02 | Imágenes: pintura clásica de dominio público. Sin IA para rostros de santos. Íconos propios dibujados | Legal, respetuoso, consistente |
| 2026-10-02 | Biblia citada solo de dominio público (RV1909 / KJV) mientras no haya licencia | Derechos de autor |
| 2026-10-02 | Colores cambiables en Configuración; **Rosa mística por defecto** | A la amiga le gustó el rosado |
| 2026-10-02 | Animación fuerte en recompensas, calma en oración | Evitar sobrecarga |
| 2026-10-02 | Expo (React Native) + TypeScript, Reanimated + Skia | Actualizaciones por aire, lógica JS de la maqueta reutilizable |
| 2026-10-02 | Trabajo con subagentes en Claude Code | Separar interfaz, contenido, verificación, imágenes y QA |
| 2026-10-02 | ~~Gratis con anuncios~~ (descartado el mismo día) | Ver la fila siguiente. Referencia en `docs/archivo/anuncios-descartado.md` |
| 2026-10-02 | **Gratis y sin anuncios**, con compra voluntaria "Apoyar la app" que no desbloquea nada, y patrocinio opcional | Las tiendas no pagan por publicar; los costos son bajos; mantener el diferenciador. Detalle en `docs/apoyo.md` |
| 2026-10-02 | **Enfoque global.** Español neutro + inglés; nada supone un país. Líneas de ayuda por país según la región del teléfono, con respaldo Find A Helpline | Pedido de Felipe. Seguridad en cualquier país |
| 2026-10-02 | **Sin permiso de ubicación.** Idioma y país se toman del teléfono (`expo-localization`), se confirman en una bienvenida de un toque y se pueden cambiar en Configuración. Tarjeta de ayuda con "¿Estás en otro país?" + Find A Helpline | Privacidad, menos fricción; la ubicación es dato personal |
| 2026-10-03 | Configuración es una ruta modal (`/configuracion`) que se abre desde un botón de engranaje en el encabezado de cada pestaña; no es una quinta pestaña | La barra tiene 4 pestañas como la maqueta; Configuración es secundaria y en la maqueta vive fuera del teléfono |
| 2026-10-03 | Los textos suaves y el acento usado como texto se oscurecen hacia `ink` solo lo necesario para cumplir AA (4.5:1) sobre el cielo; `primary`/`glow` siguen exactos para gráficos y superficies. **Aprobado por Felipe**: la legibilidad manda. Valores en `docs/sistema-diseno.md` | Con los valores literales de la maqueta, Rosa mística no llegaba a AA de día ni en Vísperas (texto suave 4.39/4.21, pestaña activa 4.26/4.07) |
| 2026-10-03 | Fechas de novenas en días civiles locales (`app/src/lib/novenas.ts`), no restando milisegundos como la maqueta. Pruebas Jest en 6 zonas horarias (`npm run test:tz`) | La maqueta muestra el inicio un día antes cuando el cambio de horario cae dentro de la novena (27 fiestas 2026–2028 en Santiago, Madrid, Nueva York, Auckland) |
| 2026-10-03 | Almacenamiento local: **`expo-sqlite`**. Preferencias (paleta, hora, idioma) en `expo-sqlite/kv-store`; progreso (velas, rasgos, medallas) en tablas SQLite (`app/src/lib/progreso.ts`, migraciones con `PRAGMA user_version`). Resuelve el pendiente n.º 8 | Un solo motor para todo; kv-store tiene lectura síncrona, así la paleta guardada se aplica sin parpadeo al abrir; el progreso necesita consultas (velas por novena y año, medallas por colección) y transacciones, que AsyncStorage no da; viene incluido en Expo Go |
| 2026-10-03 | Interlineado explícito en cada rol tipográfico (Figtree ≥ 1.25, Cormorant ≥ 1.3, Literata 1.72, capitular ≥ 1.3) y, en Android 14+, compensación de la escala de letra no lineal en `Texto` e `Icono` (`app/src/theme/escala-letra.ts`, tablas de AOSP) | Con interlineado menor que la altura de la fuente Android recortaba descendentes; y con letra grande en Android 14+ React Native escala `fontSize` y `lineHeight` por separado con la curva no lineal, lo que volvía a recortar (visto en el emulador con escala 2.0) |
| 2026-10-03 | Día de la fiesta: estado **"Hoy es su fiesta"** con trato de celebración (las 9 velas encendidas si completó la novena). Desde el día siguiente pasa a la fiesta del próximo año | La maqueta saltaba al año siguiente el mismo día de la fiesta y la persona no veía nada ese día |
| 2026-10-03 | Convención: una fiesta del **29 de febrero se celebra el 28 de febrero** en años no bisiestos (novena del 19 al 27 feb). Una fecha imposible en el contenido (p. ej. 31 de abril) es un error, no se corre de mes | JavaScript la convertía en 1 de marzo sin avisar |
| 2026-10-03 | Textos de interfaz con **i18next + react-i18next**, idioma inicial desde `expo-localization` y guardado en preferencias. Solo interfaz (botones, etiquetas, "Día 3 de 9"); el contenido sigue en `content/contenido.json` con sus campos es/en, sin duplicarse. Sumar un idioma = un JSON más | Plurales e interpolación; preparado para más idiomas. Se incluye el polyfill `intl-pluralrules` porque Hermes no trae `Intl.PluralRules` y sin él los plurales fallan en idiomas como francés, polaco o árabe |
| 2026-10-03 | Contenido empaquetado en la app desde `content/contenido.json` (Metro vigila `/content`; sin copia). En desarrollo se ve todo; en producción solo `revision: "aprobado"`. Lo que no tiene campo `revision` (novenas, próximamente) no se publica hasta tenerlo; rasgos y colecciones siguen a sus lecturas aprobadas; el respaldo Find A Helpline se muestra siempre | Principio 7, aplicado en estricto. Hoy todo está en borrador: un build de producción sale sin contenido |
| 2026-10-03 | País y bienvenida: el país sale de la región del teléfono; el elegido por la persona manda. Se guarda con la paleta y el idioma | Principio 6, sin permiso de ubicación |
| 2026-10-03 | Bienvenida con `Stack.Protected` de Expo Router: la marca de "bienvenida completa" se lee síncrona, así las pestañas nunca se dibujan antes. "Prefiero no decirlo" se guarda como `ZZ` (código CLDR de región desconocida) y la app lo trata como sin país → respaldo Find A Helpline | Sin parpadeo; y sin `ZZ`, al reabrir volvía a mandar la región del teléfono contra la elección de la persona |
| 2026-10-03 | Contenido actual (emociones, lecturas, novenas, próximamente, santos del día) **aprobado por el cura de la comuna**: `revision: "aprobado"`. Novenas y próximamente pasan a tener campo `revision`. Las **líneas de ayuda quedan fuera**: sus números se aprueban solo tras verificarlos con la fuente oficial (pendiente 12) | Revisión doctrinal hecha. Un sacerdote aprueba doctrina y tono, no la vigencia de un teléfono de crisis |
| 2026-10-03 | Santo del día con `lit` (color de la celebración) y `rango` opcional (solemnidad, fiesta, memoria, memoria libre). El color del día se calcula: tiempo litúrgico desde la Pascua (algoritmo gregoriano) y el santo manda según su rango (no en domingos ni días privilegiados; la memoria libre no cambia el color). Rosado en Gaudete y Laetare | Que el color sea correcto cualquier año, no una lista por fecha. Simplificaciones (Epifanía/Ascensión trasladadas, fiestas del Señor en domingo) quedan para el calendario por país (n.º 13) |
| 2026-10-03 | Día sin santo cargado: Hoy muestra un respaldo sin santo (color del tiempo litúrgico, sin nombre ni inicial inventados). Nunca se toma el santo de otro día | La maqueta caía al 29 de septiembre: eso muestra un santo equivocado |
| 2026-10-03 | Evangelio: texto de ejemplo en `evangelio_ejemplo` (en borrador, el validador impide aprobarlo). En desarrollo se ve marcado "Ejemplo"; en producción la tarjeta no aparece hasta tener fuente (n.º 4) | No publicar un evangelio que no es el del día |
| 2026-10-03 | Celebraciones móviles calculadas desde la Pascua: Trinidad, Corpus (jueves, fecha universal), Sagrado Corazón y Cristo Rey (solemnidades, blanco); María Madre de la Iglesia e Inmaculado Corazón (memorias). Gana la de mayor rango entre el santo y la móvil. Jueves Santo en blanco todo el día. Las solemnidades impedidas no se trasladan aún (n.º 13) | qa encontró que salían en verde |
| 2026-10-03 | El chip de Hoy ("Laudes · 3 oct") nombra la hora de oración del reloj; la preferencia de hora en Configuración solo cambia el cielo | No decir "Completas" a las 10:00 |
| 2026-10-03 | Hoy: la semilla del vitral depende solo del santo (misma figura en las dos paletas); engranaje a la izquierda sobre el vitral (la cinta va a la derecha); "Volver" sobre el vitral con fondo al 60 % para cumplir AA; el vitral de la historia queda quieto (nivel 3); las animaciones de ambiente se apagan fuera de foco; "Conocer su historia" solo si hay historia; etiqueta de la oración neutra ("Oración") | Consistencia, contraste y calma; la maqueta deducía el género del nombre |
| 2026-10-03 | Grano de película fuera por ahora: como lienzo Skia a pantalla completa bajaba Hoy de ~17 a ~9 fps en el emulador. Volver con una textura más barata. El objetivo de 60 fps se mide en un Android físico con build de release (el emulador está limitado por su GPU emulada) | Rendimiento |
| 2026-10-03 | Rotación de Emociones por días civiles desde una fecha fija (no por día del año), módulo la cantidad de entradas. "Otra oración" es un desplazamiento solo en memoria: no se guarda ni se cuenta | La maqueta repetía o saltaba entradas al cambiar de año; principio 1 |
| 2026-10-03 | Llamar abre el marcador con `tel:` (la persona confirma; nunca se llama sola). `#` va como `%23`. En iPhone, Apple no marca enlaces `tel:` con `*` o `#` (p. ej. *4141): ahí se muestra el número grande para marcarlo a mano, con opción de copiarlo | Restricción de iOS; que la ayuda nunca quede en un botón que no hace nada |
| 2026-10-03 | Detalle de emoción en `app/emocion/[id].tsx`, fuera de las pestañas (sin barra a la vista mientras se reza), con fundido. Tonos de emoción: OKLCH del sistema de diseño convertido a hex al resolver el tema (Ottosson), reduciendo croma si cae fuera de sRGB; texto AA verificado en 12 emociones × 2 paletas × 3 horas. Título de la tarjeta de ayuda neutro ("No tienes que cargar esto a solas.") | Una cosa por pantalla; RN no soporta OKLCH; lenguaje sin suponer género |
| 2026-10-03 | La aprobación del cura cubre que el contenido sea católicamente correcto. La app es global y **neutra en región y en género**: los textos con género heredados de la maqueta (Cansada, Confundida, "No me dejes sola", "estoy agotada", "me siento sola") se corrigen | Aclaración de Felipe |

## Pendiente (bloquea publicación)

| # | Pregunta | Quién decide | Notas |
|---|---|---|---|
| 1 | Nombre definitivo de la app | Felipe y su amiga | "Obra Buena" es provisorio |
| 3 | Traducción del evangelio del día: licencia de texto litúrgico o RV1909 | Felipe y su amiga | Los textos litúrgicos en español tienen derechos |
| 4 | Fuente automática del santo del día y del evangelio | Arquitecto (propone), Felipe (aprueba) | Verificar licencia y estabilidad |
| 5 | ~~Fecha de Corpus Christi~~ → se resuelve con el calendario por país (n.º 13) | — | — |
| 6 | Cómo probar en iPhone (Felipe usa Windows) | Felipe | Teléfono físico con build de desarrollo vía EAS |
| 7 | Cuentas de tienda: Apple (USD 99/año) y Google Play (USD 25) | Felipe | Google exige prueba cerrada con testers antes de publicar |
| 9 | Lanzar primero solo en Android (USD 25) y en iPhone cuando haya aportes | Felipe y su amiga | Recomendado por el arquitecto |
| 10 | Política de privacidad (obligatoria para las tiendas y la Ley 21.719) | Felipe | Corta: la app no recoge datos personales |
| 11 | Montos de "Apoyar la app" y librería de compras | Felipe (montos), arquitecto (librería) | Ver `docs/apoyo.md` |
| 12 | Líneas de ayuda: verificar con fuente oficial y ampliar países (Colombia, Perú, Ecuador, Canadá, Australia…) | Agentes contenido + verificador; aprobación humana | 7 países en borrador; AR y Salud Responde con fuente secundaria |
| 13 | Calendario litúrgico por país (fiestas trasladadas, santos propios) | Arquitecto | Ej.: Corpus Christi en domingo en Chile; Teresa de los Andes 13 de julio en Chile |
| 14 | Leccionario por país/idioma: cada conferencia episcopal tiene su traducción y derechos | Felipe y su amiga | La carta actual es para Chile; mientras tanto RV1909 / KJV |
