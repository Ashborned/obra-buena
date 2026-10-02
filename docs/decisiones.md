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

## Pendiente (bloquea publicación)

| # | Pregunta | Quién decide | Notas |
|---|---|---|---|
| 1 | Nombre definitivo de la app | Felipe y su amiga | "Obra Buena" es provisorio |
| 2 | Quién aprueba el contenido (revisión doctrinal) | Felipe y su amiga | La amiga o un sacerdote de confianza. Por colecciones |
| 3 | Traducción del evangelio del día: licencia de texto litúrgico o RV1909 | Felipe y su amiga | Los textos litúrgicos en español tienen derechos |
| 4 | Fuente automática del santo del día y del evangelio | Arquitecto (propone), Felipe (aprueba) | Verificar licencia y estabilidad |
| 5 | ~~Fecha de Corpus Christi~~ → se resuelve con el calendario por país (n.º 13) | — | — |
| 6 | Cómo probar en iPhone (Felipe usa Windows) | Felipe | Teléfono físico con build de desarrollo vía EAS |
| 7 | Cuentas de tienda: Apple (USD 99/año) y Google Play (USD 25) | Felipe | Google exige prueba cerrada con testers antes de publicar |
| 8 | Almacenamiento local: SQLite o AsyncStorage | Arquitecto | Primera tarea de datos |
| 9 | Lanzar primero solo en Android (USD 25) y en iPhone cuando haya aportes | Felipe y su amiga | Recomendado por el arquitecto |
| 10 | Política de privacidad (obligatoria para las tiendas y la Ley 21.719) | Felipe | Corta: la app no recoge datos personales |
| 11 | Montos de "Apoyar la app" y librería de compras | Felipe (montos), arquitecto (librería) | Ver `docs/apoyo.md` |
| 12 | Líneas de ayuda: verificar con fuente oficial y ampliar países (Colombia, Perú, Ecuador, Canadá, Australia…) | Agentes contenido + verificador; aprobación humana | 7 países en borrador; AR y Salud Responde con fuente secundaria |
| 13 | Calendario litúrgico por país (fiestas trasladadas, santos propios) | Arquitecto | Ej.: Corpus Christi en domingo en Chile; Teresa de los Andes 13 de julio en Chile |
| 14 | Leccionario por país/idioma: cada conferencia episcopal tiene su traducción y derechos | Felipe y su amiga | La carta actual es para Chile; mientras tanto RV1909 / KJV |
