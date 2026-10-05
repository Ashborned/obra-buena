# Obra Buena — guía del proyecto

App católica de oración para iPhone y Android, **con enfoque global**, nacida del boceto de una amiga de Felipe.
Se lanza primero en español e inglés; nada en el código puede suponer un país.
Nombre provisorio: **Obra Buena** (ver `docs/decisiones.md`).

Lee este archivo completo antes de tocar cualquier cosa. Si algo de lo que te piden contradice
este documento o `docs/decisiones.md`, detente y pregunta.

## Qué es la app

Una app de oración que parte desde **cómo se siente la persona**, no desde un catálogo.
Cuatro pestañas y Configuración:

| Pestaña | Qué hace |
|---|---|
| **Hoy** | Santo del día en un vitral, color litúrgico del día, novena en curso, evangelio del día, acceso a Emociones |
| **Emociones** | 12 emociones → versículo → oración → santo compañero. Rota una entrada distinta cada día |
| **Novenas** | Novenas con fechas reales (los 9 días antes de la fiesta), velas que se encienden, recordatorios |
| **Aprender** | Lecturas sobre santos por colecciones, rasgos que aparecen al leer, quiz de alternativas y medallas en una vitrina |
| **Configuración** | Paleta, idioma, tamaño de letra, notificaciones |

La maqueta de referencia está en `prototype/obra-buena.html`. Ábrela en un navegador:
es la fuente de verdad visual y de comportamiento hasta que la app la supere.

## Principios que no se negocian

1. **La oración no se premia.** Nada de puntos, rachas ni medallas por rezar, marcar velas o usar Emociones.
   El juego vive solo en Aprender (conocimiento).
2. **Privada por diseño.** Sin cuentas ni login. Todo el progreso se guarda en el teléfono.
   No se envía nada sobre lo que la persona siente o reza. Sin analítica ni anuncios de terceros.
3. **Gratis y sin anuncios.** Se financia con la compra voluntaria "Apoyar la app", que no desbloquea nada (ver `docs/apoyo.md`).
4. **Una cosa por pantalla.** Si una pantalla compite por atención, está mal.
5. **Bilingüe de verdad.** Español neutro e inglés con el mismo cuidado (preparado para sumar idiomas). Ningún texto se escribe en código: todo va en `content/` o en los archivos de traducción.
6. **Cuidado en la salud mental, según el país.** Depresión, Triste y Soledad siempre muestran ayuda real
   del país de la persona, tomada de `content/contenido.json` → `ayuda`:
   - El país sale de la **región del teléfono** (`expo-localization`). **La app no pide permiso de ubicación.** Idioma y país se confirman en la bienvenida y se cambian en Configuración.
   - La tarjeta de ayuda siempre ofrece "¿Estás en otro país?" para cambiarlo en el momento.
   - Si no hay líneas verificadas para ese país: tarjeta de respaldo con **Find A Helpline** (findahelpline.com) y el aviso de llamar al número de emergencias local.
   - Nunca se muestra el número de otro país como si fuera local. Ningún número se escribe en el código.
8. **Global, sin suponer un país.** Todo lo que depende del país (líneas de ayuda, fiestas trasladadas,
   santos propios, traducción del leccionario) va en `content/` con su campo `pais`/`paises`.
   Lo regional se muestra primero donde corresponde, pero no se esconde a los demás.
7. **Contenido con fuente, sin paso de aprobación.** El contenido se muestra directo y se puede agregar o cambiar en cualquier momento; se revisa en una revisión final. Prioridad actual: la funcionalidad de la app. Excepción: un número de línea de ayuda solo aparece si está verificado (`revision: "aprobado"`).

## Tecnología

- **Expo (React Native) + TypeScript**, Expo Router, SDK 54 o superior.
- Animación: `react-native-reanimated`; gráficos dibujados (vitral, velas, medallas): `@shopify/react-native-skia`.
- Almacenamiento local: `expo-sqlite` o `AsyncStorage` (decidir en la primera tarea de datos y anotarlo en decisiones).
- Notificaciones locales: `expo-notifications` (sin servidor).
- Actualizaciones de contenido y correcciones: EAS Update.
- Instala dependencias siempre con `npx expo install`, nunca con `npm install` directo.

## Estructura del repositorio

```
/app                 Proyecto Expo (se crea con: npx create-expo-app@latest app)
/content
  contenido.json     Base de contenido (emociones, lecturas, novenas, santos)
  schema.md          Formato de cada campo
  archivo/           Versiones antiguas, solo referencia
/assets
  imagenes/          Pinturas de dominio público
  manifiesto.json    Autor, obra, año, fuente y licencia de CADA imagen
/docs
  decisiones.md      Qué está decidido y qué falta. Se actualiza en cada decisión
  sistema-diseno.md  Colores, tipografía, espaciado, componentes
  guia-movimiento.md Qué se anima, cómo y cuándo
  contenido.md       Reglas para escribir contenido
  apoyo.md           Compra voluntaria "Apoyar la app" y patrocinio
/prototype           Maqueta HTML de referencia
/scripts
  validar-contenido.mjs   node scripts/validar-contenido.mjs
/.claude/agents      Subagentes del proyecto
```

## Agentes

La sesión principal es el **arquitecto**: decide estructura, reparte trabajo y revisa.
Delega en estos subagentes (`.claude/agents/`):

| Agente | Úsalo para |
|---|---|
| `interfaz-movimiento` | Pantallas, componentes, sistema de diseño y animaciones |
| `contenido` | Investigar y escribir lecturas, emociones, quizzes y santos |
| `verificador` | Revisar contenido nuevo con ojo adversarial antes de aceptarlo |
| `imagenes` | Buscar pinturas de dominio público y registrar su licencia |
| `qa` | Pruebas, accesibilidad, modo sin internet |

Flujo de contenido: `contenido` escribe → `node scripts/validar-contenido.mjs` → entra a la app. El `verificador` se usa cuando Felipe lo pida o en la revisión final.

## Comandos

```
node scripts/validar-contenido.mjs      # validar contenido (debe pasar antes de cada commit)
cd app && npx expo start                # correr la app (lo hace Felipe, ver abajo)
cd app && npx expo install <paquete>    # agregar dependencias
```

**Servidor de Expo: lo mantiene Felipe** abierto en su terminal con `EXPO_UNSTABLE_MCP_SERVER=1`.
Ningún agente inicia, detiene ni reinicia servidores de Expo/Metro (`expo start`, `expo run`, etc.).
Si hace falta reiniciar con `-c` (paquete instalado o quitado, cambio en `metro.config.js` o `app.json`, caché rara), se le pide a Felipe.

## Reglas de trabajo

- Cada decisión nueva se anota en `docs/decisiones.md` con fecha y motivo.
- Commits pequeños y en español: `feat(novenas): velas encendibles`.
- No inventes datos de santos, fechas ni citas. Si no hay fuente, no va.
- Respeta `prefers-reduced-motion` / "Reducir movimiento" del sistema en toda animación.
- Antes de dar por terminada una pantalla: funciona sin internet, en ES y EN, en las dos paletas y con letra grande.
