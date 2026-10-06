# Marca de Soul Shelter

Ícono **Llama**: una vela de novena encendida sobre el cielo de Rosa mística.
Lo eligió Felipe entre tres conceptos (decisión del 2026-10-06 en `docs/decisiones.md`).
Es un dibujo propio, escrito a mano en SVG: sin IA, sin texto y sin imágenes de terceros.

## Fuente (se edita a mano)

| Archivo | Qué es |
|---|---|
| `fondo.svg` | Fondo: degradado vertical `primaryDeep` → `primary` y halo de `glow` detrás de la llama |
| `simbolo.svg` | Vela a color: llama de dos capas, mecha y cera. Cabe en el círculo central de radio 313 de 1024 (zona segura 66/108 de Android) |
| `simbolo-mono.svg` | El mismo símbolo en una sola tinta (llama con el centro recortado y la cera) |

## Generados (no editar: los reescribe el script)

| Archivo | Medidas | Uso |
|---|---|---|
| `icono.svg` | 1024 | Fondo + símbolo agrandado ×1.18 |
| `grafico-destacado.svg` | 1024×500 | Fondo, vela y el nombre de `app/app.json` en Cormorant Garamond 600 (OFL), convertido a trazos |
| `app/assets/images/icon.png` | 1024×1024, RGB sin alfa | Ícono de iOS y ícono base |
| `app/assets/images/android-icon-background.png` | 432×432, RGB | Capa de fondo del ícono adaptativo |
| `app/assets/images/android-icon-foreground.png` | 432×432, RGBA | Capa del símbolo (todo dentro del círculo central de 264 px) |
| `app/assets/images/android-icon-monochrome.png` | 432×432, RGBA | Ícono temático de Android 13+ (misma zona segura) |
| `app/assets/images/favicon.png` | 48×48, RGB | Web |
| `app/assets/images/splash-icon.png` | 1024×1024, RGBA | Pantalla de carga: el símbolo solo, recortado a su círculo seguro |
| `salidas/play-icono-512.png` | 512×512, RGBA (32 bits) | Ícono de Google Play (≤ 1024 KB) |
| `salidas/play-grafico-1024x500.png` | 1024×500, RGB sin alfa (24 bits) | Gráfico destacado de Google Play |

## Colores (tokens de `docs/sistema-diseno.md`, Rosa mística; el fondo no cambia con la paleta)

| Uso | Color | Token |
|---|---|---|
| Cielo arriba | `#34264F` | `primaryDeep` |
| Cielo abajo | `#7B55C9` | `primary` |
| Halo y llama | `#F28CB6` | `glow` |
| Centro de la llama | `#FFFBE0` | `coloresVela.llamaCentro` |
| Cera | `#E7DCC2` · `#FFFAF0` · `#D9CCAD` | `coloresVela.ceraBorde` · `ceraLuz` · `ceraSombra` |
| Mecha | `#3B2D1F` | `coloresVela.mecha` |
| Nombre (gráfico destacado) | `#FFD3E4` | `glowSoft` |

## Cómo se genera

```
npm install        # en la raíz del repo, una vez
npm run marca      # node scripts/generar-marca.mjs
```

El script dibuja todo desde estos SVG con resvg. Es idempotente y al final revisa cada salida:
medidas, canal alfa (sin alfa donde la tienda lo exige), peso y que nada se salga de la zona segura.
Si algo no cumple, falla.

**Por qué un `package.json` en la raíz.** Las herramientas de marca (`@resvg/resvg-js`, `pngjs` para
quitar el canal alfa y `opentype.js` para convertir el nombre a trazos) son solo `devDependencies`
del repositorio. No entran al paquete de la app, no pasan por `npx expo install` y no tocan las
versiones que Expo fija en `/app`. El texto no usa ninguna fuente del sistema: la fuente se lee de
`app/node_modules/@expo-google-fonts/cormorant-garamond` (hay que haber instalado la app antes).
