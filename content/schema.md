# Formato de `contenido.json`

Validar siempre con `node scripts/validar-contenido.mjs`.
Todo texto visible va en pares `es` / `en`. Los arreglos `[es, en]` siempre llevan primero el español y después el inglés.
`revision`: `borrador` | `pendiente` | `aprobado` | `rechazado`.

## `emociones[]`

```jsonc
{
  "id": "sad",                 // happy, tired, healing, depression, sad, confused, anger, joy, lonely, love, forgiveness, gratitude
  "es": "Triste", "en": "Sad",
  "care": 1,                   // opcional: muestra la tarjeta de ayuda del país (ver `ayuda`)
  "items": [{                  // meta: 7 por emoción; la app muestra uno por día
    "ref": ["Salmo 30:5", "Psalm 30:5"],
    "v":   ["texto RV1909", "texto KJV"],
    "p":   ["oración es", "oración en"],
    "c": {                     // santo compañero
      "ini": "M",
      "nov": "mon",            // opcional: id de novena
      "lrn": "pedro",          // opcional: id de lectura
      "es": ["Santa Mónica", "una línea verdadera"],
      "en": ["St. Monica", "one true line"],
      "fuentes": ["https://…", "https://…"]  // URLs que respaldan la línea del santo (mín. 1, ideal 2 independientes)
    },
    "revision": "borrador"
  }]
}
```

## `lecturas[]` (Aprender)

```jsonc
{
  "id": "pedro", "ini": "P",
  "lit": "red",                // color de la cinta de la medalla: green | white | red | purple
  "mins": 6, "pass": 4,
  "traits": ["keys", "boat", "rooster"],   // 3 claves de `rasgos`; el primero es el principal de la medalla
  "fuentes": ["url o referencia"],          // obligatorio, mínimo 1
  "revision": "borrador",
  "es": {
    "name": "San Pedro", "sub": "Príncipe de los apóstoles",
    "ring": "SAN PEDRO · APÓSTOL",          // texto del borde de la medalla
    "secs": [{                              // 5 secciones
      "h": "Título",
      "trait": "boat",                      // opcional: aquí se descubre el rasgo
      "ps": ["párrafo"],
      "q": ["cita", "referencia"],          // opcional
      "ps2": ["párrafo después de la cita"] // opcional
    }],
    "quiz": [{ "q": "pregunta", "o": ["A", "B", "C", "D"], "a": 0, "e": "explicación con fuente" }]  // 5 preguntas
  },
  "en": { "...": "misma estructura, mismo número de secciones y preguntas, misma respuesta correcta" }
}
```

## `rasgos{}`

`"keys": { "es": ["Las llaves", "descripción corta"], "en": ["The keys", "short description"] }`.
Cada rasgo nuevo necesita su ícono en la app (componente `TraitIcon`).

## `colecciones[]`

`{ "id": "chile", "pais": "CL", "es": "Santos de Chile", "en": "Saints of Chile", "items": ["teresa", "hurtado", "laura"] }`.
`pais` (opcional, código ISO de 2 letras): la colección se muestra primero en ese país; los demás la ven igual.
Cada `item` es un `id` de `lecturas` o de `proximamente`.

## `proximamente[]`

`{ "id": "laura", "ini": "L", "es": {"name": "...", "sub": "..."}, "en": {...}, "revision": "borrador" }`

## `novenas[]`

`{ "id": "ter", "es": "...", "en": "...", "ini": "T", "m": 10, "d": 1, "revision": "borrador" }`: fiesta fija (mes y día). La novena son los 9 días anteriores.
Una fiesta del 29 de febrero se celebra el 28 en años no bisiestos.
`{ ..., "fixed": [2027, 5, 27] }`: fiesta móvil para un año concreto (pendiente: cálculo automático a partir de la Pascua).

## `santos_del_dia{}` e `historias_santos{}`

Clave `MM-DD`. `santos_del_dia`: `{ "ini": "A", "lit": "white", "rango": "memoria", "es": [nombre, subtítulo, resumen], "en": [...] }`.
- `lit` (obligatorio): color litúrgico de la celebración: `green | white | red | purple`.
- `rango` (opcional): `solemnidad | fiesta | memoria | memoria_libre`, según el Calendario Romano General.
  Decide si el color del santo es el color del día o si manda el tiempo litúrgico (domingos, Cuaresma, Semana Santa…;
  ver `app/src/lib/liturgia.ts`). Sin `rango`, manda el tiempo litúrgico.
- Si un día no tiene santo cargado, la app muestra un respaldo sin santo (nunca se inventa uno) y el color del tiempo litúrgico.
`historias_santos`: `{ "es": { "f": [datos], "st": [párrafos], "q": "cita", "qr": "fuente de la cita", "pr": "oración" }, "en": {...} }`.
Temporal: solo hay unos pocos días de ejemplo. Se reemplazará por la fuente automática (decisión pendiente n.º 4).

## `evangelio_ejemplo`

`{ "ref": [es, en], "t": [RV1909, KJV], "nota": "...", "revision": "borrador" }`.
Texto de ejemplo para la tarjeta del evangelio mientras no haya fuente automática (decisión pendiente n.º 4).
Nunca se aprueba: en producción la tarjeta no aparece.

## `ayuda` (líneas de crisis por país)

```jsonc
{
  "respaldo": {                                   // se muestra si el país no tiene líneas verificadas
    "nombre": {"es": "...", "en": "..."}, "url": "https://findahelpline.com",
    "nota": {"es": "Si estás en peligro inmediato, llama al número de emergencias de tu país.", "en": "..."},
    "fuente": "https://findahelpline.com/about"
  },
  "paises": [{
    "pais": "CL",                                 // ISO 3166-1 alfa-2, el mismo que da expo-localization
    "nombre": {"es": "Chile", "en": "Chile"},
    "emergencia": "112",                          // opcional, solo si la fuente lo dice
    "lineas": [{
      "nombre": {"es": "...", "en": "..."},
      "numero": "*4141",                          // como se muestra
      "marcar": "*4141",                          // como se marca (sin espacios); el botón llama a este
      "detalle": {"es": "24 horas, gratis", "en": "24/7, free"},
      "fuente": "https://url-oficial-leida"
    }],
    "verificado": "2026-10-02",                   // fecha de la última verificación
    "revision": "borrador"
  }]
}
```
