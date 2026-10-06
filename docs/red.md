# Llamadas de red

Principio 2: la app no envía nada sobre lo que la persona siente, reza o aprende.
Esta lista se revisa en cada hito que agregue una dependencia o un enlace. Última revisión: 2026-10-05.

## Resultado

**La app no hace ninguna petición de red propia.** No hay `fetch`, `XMLHttpRequest`, WebSocket,
analítica, anuncios, notificaciones push, informes de errores ni actualizaciones remotas.
El contenido, las fuentes tipográficas y los íconos van empaquetados dentro de la app y funcionan sin internet.

## Salidas de la app (solo cuando la persona toca algo)

| Dónde | Qué abre | Qué datos salen | Archivo |
|---|---|---|---|
| Tarjeta de ayuda, botón de llamar | El marcador del teléfono con el número (`tel:`). La persona confirma; la app nunca llama sola | Ninguno: es el marcador del sistema | `app/src/lib/llamar.ts` |
| Tarjeta de ayuda, "Find A Helpline" | `https://findahelpline.com` en el navegador del teléfono | Ninguno de la app: la URL es fija, sin país ni emoción | `app/src/components/tarjeta-ayuda.tsx` |
| Novena, permiso de avisos negado | Los ajustes del sistema (`Linking.openSettings`) | Ninguno | `app/src/app/novena/[id].tsx` |
| Configuración, patrocinio (si existe y trae `url`) | Esa URL (https, del contenido) en el navegador | Ninguno | `app/src/components/config/apoyo.tsx` |
| Configuración, recordatorios con permiso negado | Los ajustes del sistema (`Linking.openSettings`) | Ninguno | `app/src/components/config/recordatorios.tsx` |
| Configuración, política de privacidad y contacto | Marcadores hasta que existan | — | (hito 7) |

## Lo que no es de la app

- **Recordatorios:** `expo-notifications` se usa solo para avisos **locales** programados en el teléfono.
  Nunca se pide un token de push (`getExpoPushTokenAsync` / `getDevicePushTokenAsync` no se usan).
- **Desarrollo:** con Expo Go o una development build, la app se conecta al servidor de Metro en la
  computadora de Felipe para cargar el código. No existe en el build de tienda.
- **Compras (futuro, `expo-iap`):** al aportar, la tienda (Google Play o App Store) procesa el pago con
  su propia hoja de pago. La app no recibe ni guarda datos de pago y no usa un servidor propio ni de
  terceros (por eso no RevenueCat; ver `docs/decisiones.md`, 2026-10-05).
- **EAS Update (futuro):** cuando se active, la app descargará actualizaciones de contenido desde los
  servidores de Expo. Esa descarga no lleva datos de la persona; se anotará aquí al activarla.

## Cómo se verifica

- `app/src/__tests__/privacidad-red.test.ts`: recorre `app/src` buscando APIs de red y fija la lista exacta de salidas de esta tabla (una nueva hace fallar la prueba).
- Al agregar una dependencia: revisar si hace llamadas propias (analítica, informes de errores, etc.).
