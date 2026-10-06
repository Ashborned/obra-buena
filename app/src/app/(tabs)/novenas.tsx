/**
 * Lista de novenas (prototype/obra-buena.html, `state.tab` de novenas, vista lista): título, texto
 * guía y grupos "En curso", "Próximas" y "Más adelante" (los vacíos no se muestran). Cada fila: arco
 * con la inicial, nombre, fechas, insignia de estado y, si está en curso, las nueve velas pequeñas
 * con lo marcado en el teléfono. Toca → detalle (`rutaNovena`).
 *
 * Las fechas dependen del país (Corpus Christi pasa al domingo donde se traslada).
 * Calma: los grupos entran con fundido y subida de 10 px; las llamas pequeñas titilan solo con la
 * pantalla a la vista.
 */
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ArcoInicial } from '@/components/arco-inicial';
import { Pantalla } from '@/components/pantalla';
import { Tarjeta } from '@/components/tarjeta';
import { Texto } from '@/components/texto';
import { VelasMini } from '@/components/velas-mini';
import { contenido } from '@/contenido';
import { useIdioma, useTranslation, type ClaveTexto } from '@/i18n';
import { useReducirMovimiento } from '@/lib/animaciones';
import { fechaCorta, fechaLarga } from '@/lib/formato-fecha';
import {
  agruparNovenas,
  anioDeFiesta,
  type GrupoNovena,
  type NovenaConEstado,
} from '@/lib/novenas-contenido';
import { usePais } from '@/lib/pais';
import { velasEncendidas } from '@/lib/progreso';
import { rutaNovena } from '@/lib/rutas-novenas';
import { useAhora } from '@/lib/use-ahora';
import { conAlfa, espaciado, FACTOR_INTERLINEADO, familias, interlineado, radios, useTema } from '@/theme';
import { entradaCalma } from '@/theme/movimiento';

const GRUPOS: { id: GrupoNovena; titulo: ClaveTexto }[] = [
  { id: 'enCurso', titulo: 'novenas.grupos.enCurso' },
  { id: 'proximas', titulo: 'novenas.grupos.proximas' },
  { id: 'masAdelante', titulo: 'novenas.grupos.masAdelante' },
];

/** Nombre en la fila (`.row b`: 600 19 / 1.15; Cormorant necesita ≥ 1.3). */
const TAMANO_NOMBRE = 19;
/** Fechas (`.row small`). */
const TAMANO_FECHAS = 12.5;
/** Insignia (`.badge`: 700 11). */
const TAMANO_INSIGNIA = 11;
/** Fondo de la insignia "pronto" (maqueta: acento al 12 %). */
const ALFA_INSIGNIA = 0.12;

/** Clave de las velas encendidas de una novena en un año de fiesta. */
const claveVelas = (id: string, anio: number) => `${id}:${anio}`;

export default function PantallaNovenas() {
  const { t } = useTranslation();
  const reducir = useReducirMovimiento();
  const enfocada = useIsFocused();
  const { hoy } = useAhora();
  const { pais } = usePais();

  const grupos = useMemo(
    () => agruparNovenas(contenido.novenas, hoy, { pais, traslados: contenido.traslados }),
    [hoy, pais],
  );

  // Velas de las novenas en curso; se releen al volver (se encienden en el detalle).
  const [velas, setVelas] = useState<Record<string, number[]>>({});
  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      Promise.all(
        grupos.enCurso.map(async ({ novena, estado }) => {
          const anio = anioDeFiesta(estado);
          return [claveVelas(novena.id, anio), await velasEncendidas(novena.id, anio)] as const;
        }),
      )
        .then((pares) => {
          if (!vigente) return;
          const nuevas: Record<string, number[]> = Object.fromEntries(pares);
          // Sin cambios (lo normal al cambiar de pestaña): no se vuelve a dibujar la lista.
          setVelas((previas) => (JSON.stringify(previas) === JSON.stringify(nuevas) ? previas : nuevas));
        })
        .catch(() => {
          // Sin base de datos: las velas se ven apagadas y la lista sigue sirviendo.
        });
      return () => {
        vigente = false;
      };
    }, [grupos]),
  );

  const visibles = GRUPOS.filter((g) => grupos[g.id].length > 0);

  return (
    <Pantalla titulo={t('pestanas.novenas')}>
      <Animated.View entering={entradaCalma(reducir)}>
        <Texto rol="interfazSecundaria" tono="suave">
          {t('novenas.guia')}
        </Texto>
      </Animated.View>

      {visibles.length === 0 ? (
        <Texto tono="suave">{t('novenas.sinNovenas')}</Texto>
      ) : (
        visibles.map((g, i) => (
          <Animated.View
            key={g.id}
            testID={`grupo-${g.id}`}
            entering={entradaCalma(reducir, i + 1)}
            style={styles.grupo}>
            <Texto rol="etiqueta" tono="suave" accessibilityRole="header" style={styles.grupoTitulo}>
              {t(g.titulo)}
            </Texto>
            <View style={styles.filas}>
              {grupos[g.id].map((x) => (
                <FilaNovena
                  key={x.novena.id}
                  item={x}
                  encendidas={velas[claveVelas(x.novena.id, anioDeFiesta(x.estado))] ?? []}
                  titilar={enfocada}
                />
              ))}
            </View>
          </Animated.View>
        ))
      )}
    </Pantalla>
  );
}

function FilaNovena({
  item,
  encendidas,
  titilar,
}: {
  item: NovenaConEstado;
  encendidas: number[];
  titilar: boolean;
}) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const { colores, paleta } = useTema();
  const { novena, estado } = item;
  const nombre = novena[idioma];
  const enCurso = estado.dia !== null || estado.esFiesta;

  const insignia = estado.esFiesta
    ? t('novenas.esSuFiesta')
    : estado.dia !== null
      ? t('novenas.diaDe', { n: estado.dia })
      : t('novenas.empiezaEn', { count: estado.faltan });
  const fechas = t('novenas.fechas', {
    inicio: fechaCorta(estado.inicio, idioma),
    fin: fechaCorta(estado.fin, idioma),
    fiesta: fechaCorta(estado.fiesta, idioma),
  });
  const fechasAccesible = t('novenas.fechasAccesible', {
    inicio: fechaLarga(estado.inicio, idioma),
    fin: fechaLarga(estado.fin, idioma),
    fiesta: fechaLarga(estado.fiesta, idioma),
  });
  // El día de la fiesta, si completó los nueve días, las nueve velas encendidas (como en Hoy).
  const velas = estado.esFiesta && encendidas.length >= 9 ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : encendidas;
  const partes = [nombre, insignia, fechasAccesible];
  if (enCurso) partes.push(t('hoy.velasAccesible', { count: velas.length }));

  return (
    <Tarjeta
      onPress={() => router.push(rutaNovena(novena.id))}
      etiquetaAccesible={partes.join('. ')}
      pista={t('novenas.filaPista')}
      style={[
        styles.fila,
        estado.esFiesta && {
          borderColor: conAlfa(paleta.glow, 0.7),
          boxShadow: `0 10px 30px ${conAlfa(paleta.glow, 0.35)}`,
        },
      ]}>
      <View style={styles.filaArriba}>
        <ArcoInicial inicial={novena.ini} />
        <View style={styles.filaTexto}>
          <Texto style={styles.nombre}>{nombre}</Texto>
          <Texto tono="suave" style={styles.fechas}>
            {fechas}
          </Texto>
        </View>
        <View
          style={[
            styles.insignia,
            enCurso
              ? { backgroundColor: paleta.glow }
              : { backgroundColor: conAlfa(colores.acento, ALFA_INSIGNIA) },
          ]}>
          <Texto
            style={[styles.insigniaTexto, { color: enCurso ? colores.sobreLuz : colores.acentoTexto }]}>
            {insignia}
          </Texto>
        </View>
      </View>
      {enCurso ? (
        <View style={styles.velas}>
          <VelasMini encendidas={velas} diaActual={estado.dia} titilar={titilar} />
        </View>
      ) : null}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: espaciado.sm + 2 },
  grupoTitulo: { marginTop: espaciado.xs },
  filas: { gap: espaciado.sm + 2 },
  fila: {
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.md + 2,
    gap: espaciado.xs,
  },
  filaArriba: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    flexWrap: 'wrap',
  },
  filaTexto: { flex: 1, minWidth: 140, gap: espaciado.xxs },
  nombre: {
    fontFamily: familias.displaySemi,
    fontSize: TAMANO_NOMBRE,
    lineHeight: interlineado(TAMANO_NOMBRE, FACTOR_INTERLINEADO.display),
  },
  fechas: {
    fontSize: TAMANO_FECHAS,
    lineHeight: interlineado(TAMANO_FECHAS, FACTOR_INTERLINEADO.cuerpo),
    fontVariant: ['tabular-nums'],
  },
  insignia: {
    paddingVertical: espaciado.xs + 1,
    paddingHorizontal: espaciado.sm + 2,
    borderRadius: radios.pildora,
    flexShrink: 0,
  },
  insigniaTexto: {
    fontFamily: familias.interfazFuerte,
    fontSize: TAMANO_INSIGNIA,
    lineHeight: interlineado(TAMANO_INSIGNIA, FACTOR_INTERLINEADO.interfazChica),
    fontVariant: ['tabular-nums'],
  },
  velas: { marginTop: espaciado.xs, paddingLeft: espaciado.xs },
});
