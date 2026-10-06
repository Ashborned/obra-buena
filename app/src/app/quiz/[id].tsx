/**
 * Quiz de una lectura y su resultado (prototype/obra-buena.html, `renderLearn` vistas `quiz` y
 * `result`). Se abre desde el lector con `rutaQuiz(id)`; Volver regresa al lector.
 *
 * Principio 1: es un juego de conocimiento, sin presión. Sin temporizador de ningún tipo, sin
 * castigo por equivocarse (reprobar no borra nada) y se puede reintentar al instante. Una respuesta
 * marcada no se cambia (`elegir` de lib/aprender.ts).
 *
 * - Pregunta: barra de cinco segmentos (actual destacado; respondidos en verde o rojo, además con
 *   forma distinta: lleno o hueco), "Pregunta 1 de 5", la pregunta y cuatro alternativas A–D. Al
 *   elegir se marca la correcta y, si no era esa, la elegida (con ícono además del color); el resto
 *   queda atenuado y todo deshabilitado. Aparece la explicación y "Siguiente" o "Ver resultado".
 * - Resultado: se registra una sola vez (`registrarResultadoQuiz`). Si aprueba, la medalla se acuña
 *   (nivel 1) y, si se completó una colección, aparece después su medalla. Si no, la silueta y un
 *   mensaje amable con "Volver a intentarlo" y "Repasar la lectura".
 */
import * as Haptics from 'expo-haptics';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColeccionCompleta, MedallaAcunada } from '@/components/acunacion';
import { Boton } from '@/components/boton';
import { Encabezado } from '@/components/encabezado';
import { Fondo } from '@/components/fondo';
import { Icono } from '@/components/icono';
import { Medalla } from '@/components/medalla';
import { Tarjeta } from '@/components/tarjeta';
import { Texto } from '@/components/texto';
import { contenido, type Lectura, type PreguntaQuiz } from '@/contenido';
import { useIdioma, useTranslation } from '@/i18n';
import { useReducirMovimiento } from '@/lib/animaciones';
import {
  aprueba,
  elegir,
  esCorrecta,
  esUltima,
  iniciarQuiz,
  lecturaPorId,
  lecturasDeColeccion,
  puntaje,
  siguiente,
  type EstadoQuiz,
} from '@/lib/aprender';
import { registrarResultadoQuiz, type ResultadoQuiz } from '@/lib/aprender-progreso';
import { rutaLectura } from '@/lib/rutas-aprender';
import {
  coloresMedalla,
  conAlfa,
  espaciado,
  FACTOR_INTERLINEADO,
  familias,
  interlineado,
  medidas,
  medidasMedalla,
  radios,
  semanticos,
  useTema,
} from '@/theme';
import { entradaCalma } from '@/theme/movimiento';

/** Pregunta (`.qq`: 30 / 1.1; Cormorant necesita ≥ 1.3). */
const TAMANO_PREGUNTA = 30;
/** Alternativa (`.opt`: 600 15.5). */
const TAMANO_OPCION = 15.5;
/** Círculo de la letra (`.ltr`: 28). */
const LETRA = 28;
/** Segmentos de la barra: alto normal y del actual. */
const SEGMENTO = 6;
const SEGMENTO_ACTUAL = 8;
/** Fondo de una alternativa marcada (maqueta: 16 % verde / 14 % rojo sobre el vidrio). */
const MEZCLA_CORRECTA = 0.16;
const MEZCLA_INCORRECTA = 0.14;

export default function PantallaQuiz() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const idioma = useIdioma();
  const lectura = id ? lecturaPorId(contenido, id) : undefined;
  if (!lectura || lectura[idioma].quiz.length === 0) return <NoEncontrado />;
  return <Quiz key={lectura.id} lectura={lectura} />;
}

function volverAlLector(id: string) {
  if (router.canGoBack()) router.back();
  else router.replace(rutaLectura(id));
}

type Fase = { tipo: 'preguntas' } | { tipo: 'resultado'; aciertos: number; intento: number };

function Quiz({ lectura }: { lectura: Lectura }) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const reducir = useReducirMovimiento();
  const insets = useSafeAreaInsets();
  const { colores, superficies } = useTema();
  const preguntas = lectura[idioma].quiz;

  const [estado, setEstado] = useState<EstadoQuiz>(() => iniciarQuiz(preguntas));
  const [fase, setFase] = useState<Fase>({ tipo: 'preguntas' });
  const intentos = useRef(0);
  const desplazable = useRef<ScrollView>(null);

  const actual = preguntas[estado.actual];
  const respuesta = estado.respuestas[estado.actual] ?? null;
  const respondida = respuesta !== null;
  const acerto = esCorrecta(actual, respuesta);

  const alElegir = (k: number) => {
    const nuevo = elegir(estado, preguntas, k);
    if (nuevo === estado) return;
    setEstado(nuevo);
    const bien = esCorrecta(actual, k);
    AccessibilityInfo.announceForAccessibility(`${t(bien ? 'aprender.correcto' : 'aprender.noEraEsa')} ${actual.e}`);
  };

  const alSeguir = () => {
    if (esUltima(estado, preguntas)) {
      intentos.current += 1;
      setFase({ tipo: 'resultado', aciertos: puntaje(preguntas, estado.respuestas), intento: intentos.current });
    } else {
      setEstado(siguiente(estado, preguntas));
    }
    desplazable.current?.scrollTo({ y: 0, animated: false });
  };

  const reintentar = () => {
    setEstado(iniciarQuiz(preguntas));
    setFase({ tipo: 'preguntas' });
    desplazable.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <Fondo>
      <ScrollView
        ref={desplazable}
        contentContainerStyle={[
          styles.pagina,
          { paddingTop: insets.top + espaciado.sm, paddingBottom: insets.bottom + espaciado.xxxl },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('acciones.volver')}
          onPress={() => volverAlLector(lectura.id)}
          hitSlop={espaciado.xs}
          style={({ pressed }) => [
            styles.volver,
            { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
            pressed && styles.presionado,
          ]}>
          <Icono nombre="volver" color={colores.texto} tamano={medidas.iconoBoton - 3} />
          <Texto rol="boton">{t('acciones.volver')}</Texto>
        </Pressable>

        {fase.tipo === 'resultado' ? (
          <Resultado
            key={fase.intento}
            lectura={lectura}
            aciertos={fase.aciertos}
            total={preguntas.length}
            reducir={reducir}
            onReintentar={reintentar}
          />
        ) : (
          <>
            <BarraQuiz preguntas={preguntas} estado={estado} />
            <Animated.View key={estado.actual} entering={entradaCalma(reducir)} style={styles.bloque}>
              <Texto rol="etiqueta" tono="acento">
                {t('aprender.preguntaDe', { n: estado.actual + 1, total: preguntas.length })}
              </Texto>
              <Texto rol="titulo" accessibilityRole="header" style={styles.pregunta}>
                {actual.q}
              </Texto>
              <View style={styles.opciones}>
                {actual.o.map((o, k) => (
                  <Opcion
                    key={k}
                    indice={k}
                    texto={o}
                    pregunta={actual}
                    respuesta={respuesta}
                    onPress={() => alElegir(k)}
                  />
                ))}
              </View>
              {respondida ? (
                <Animated.View entering={entradaCalma(reducir)} style={styles.bloque}>
                  <Tarjeta
                    style={[
                      styles.explicacion,
                      { borderColor: conAlfa(acerto ? semanticos.correcto : semanticos.incorrecto, acerto ? 0.45 : 0.4) },
                    ]}>
                    <Texto rol="titulo" style={styles.veredicto}>
                      {t(acerto ? 'aprender.correcto' : 'aprender.noEraEsa')}
                    </Texto>
                    <Texto rol="interfazSecundaria" tono="suave">
                      {actual.e}
                    </Texto>
                  </Tarjeta>
                  <View style={styles.fila}>
                    <Boton
                      variante="luz"
                      texto={t(esUltima(estado, preguntas) ? 'aprender.verResultado' : 'aprender.siguiente')}
                      onPress={alSeguir}
                    />
                  </View>
                </Animated.View>
              ) : null}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </Fondo>
  );
}

/** Barra de cinco segmentos: actual destacado; correcta llena en verde; incorrecta hueca en rojo. */
function BarraQuiz({ preguntas, estado }: { preguntas: readonly PreguntaQuiz[]; estado: EstadoQuiz }) {
  const { colores } = useTema();
  return (
    // El progreso ya se lee en "Pregunta 1 de 5" y en cada explicación.
    <View style={styles.barra} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {preguntas.map((p, k) => {
        const r = estado.respuestas[k] ?? null;
        const esActual = k === estado.actual;
        const estilo =
          r === null
            ? { backgroundColor: esActual ? conAlfa(colores.acento, 0.45) : colores.linea }
            : esCorrecta(p, r)
              ? { backgroundColor: semanticos.correcto }
              : { borderWidth: 1.5, borderColor: semanticos.incorrecto, backgroundColor: conAlfa(semanticos.incorrecto, 0.12) };
        return <View key={k} style={[styles.segmento, { height: esActual ? SEGMENTO_ACTUAL : SEGMENTO }, estilo]} />;
      })}
    </View>
  );
}

function Opcion({
  indice,
  texto,
  pregunta,
  respuesta,
  onPress,
}: {
  indice: number;
  texto: string;
  pregunta: PreguntaQuiz;
  respuesta: number | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colores, superficies } = useTema();
  const letra = t('aprender.letrasOpciones').charAt(indice);
  const respondida = respuesta !== null;
  const correcta = respondida && indice === pregunta.a;
  const incorrecta = respondida && indice === respuesta && indice !== pregunta.a;
  const atenuada = respondida && !correcta && !incorrecta;

  const base = t('aprender.opcionAccesible', { letra, texto });
  const etiqueta = correcta
    ? t('aprender.opcionCorrecta', { opcion: base })
    : incorrecta
      ? t('aprender.opcionIncorrecta', { opcion: base })
      : base;
  const semantico = correcta ? semanticos.correcto : incorrecta ? semanticos.incorrecto : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: respondida, selected: indice === respuesta }}
      disabled={respondida}
      onPress={onPress}
      style={({ pressed }) => [
        styles.opcion,
        { borderColor: semantico ?? superficies.vidrioBorde, backgroundColor: superficies.vidrio },
        pressed && styles.presionado,
      ]}>
      {/* Tinte verde o rojo sobre el vidrio (una capa aparte: en Android, cambiar el degradado de una
          vista ya dibujada tumbó Expo Go; ver novena/[id].tsx). */}
      {semantico ? (
        <View
          pointerEvents="none"
          style={[
            styles.tinte,
            { backgroundColor: conAlfa(semantico, correcta ? MEZCLA_CORRECTA : MEZCLA_INCORRECTA) },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.letra,
          { backgroundColor: semantico ?? conAlfa(colores.acento, 0.12) },
        ]}>
        {semantico ? (
          <Icono nombre={correcta ? 'correcto' : 'incorrecto'} color={coloresMedalla.sobreSemantico} tamano={16} />
        ) : (
          <Texto allowFontScaling={false} style={[styles.letraTexto, { color: atenuada ? colores.textoSuave : colores.acentoTexto }]}>
            {letra}
          </Texto>
        )}
      </View>
      <Texto style={[styles.opcionTexto, { color: atenuada ? colores.textoSuave : colores.texto }]}>{texto}</Texto>
    </Pressable>
  );
}

// Resultado -------------------------------------------------------------------------------------

function Resultado({
  lectura,
  aciertos,
  total,
  reducir,
  onReintentar,
}: {
  lectura: Lectura;
  aciertos: number;
  total: number;
  reducir: boolean;
  onReintentar: () => void;
}) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const enfocada = useIsFocused();
  const gano = aprueba(lectura, aciertos);
  const nombre = lectura[idioma].name;
  const [resultado, setResultado] = useState<ResultadoQuiz | null>(null);
  const registrado = useRef(false);

  // Se registra una sola vez por intento (este componente se monta de nuevo en cada intento).
  useEffect(() => {
    if (registrado.current) return;
    registrado.current = true;
    registrarResultadoQuiz(lectura, aciertos)
      .then(setResultado)
      .catch(() => {
        // Sin base de datos: el resultado se muestra igual; la medalla no quedó guardada.
      });
    if (gano) {
      AccessibilityInfo.announceForAccessibility(t('aprender.anuncioMedalla', { nombre, n: aciertos, total }));
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {
        // Sin vibración disponible.
      }
    }
  }, [lectura, aciertos, gano, nombre, total, t]);

  const colecciones = coleccionesDe(resultado);
  // Al llegar el resultado guardado, se anuncia cada colección completada.
  useEffect(() => {
    coleccionesDe(resultado).forEach((col) =>
      AccessibilityInfo.announceForAccessibility(t('aprender.anuncioColeccion', { nombre: col[idioma] })),
    );
  }, [resultado, idioma, t]);

  const puntajeTexto = t('aprender.acertaste', { n: aciertos, total });

  if (!gano) {
    return (
      <Animated.View entering={entradaCalma(reducir)} style={styles.resultado}>
        <View style={styles.revelado}>
          <Medalla variante="silueta" tamano={medidasMedalla.resultadoSilueta} />
        </View>
        <Texto rol="displayGrande" accessibilityRole="header" style={styles.centrado}>
          {puntajeTexto}
        </Texto>
        <Texto rol="interfazSecundaria" tono="suave" style={[styles.centrado, styles.lead]}>
          {t('aprender.casi')}
        </Texto>
        <View style={[styles.fila, styles.filaCentrada]}>
          <Boton variante="luz" texto={t('aprender.reintentar')} pista={t('aprender.reintentarPista')} onPress={onReintentar} />
          <Boton texto={t('aprender.repasar')} onPress={() => volverAlLector(lectura.id)} />
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.resultado}>
      <MedallaAcunada tamano={medidasMedalla.resultado} reducir={reducir} activo={enfocada}>
        <Medalla
          variante="lectura"
          lectura={lectura}
          rasgos={lectura.traits}
          tamano={medidasMedalla.resultado}
          etiqueta={t('aprender.medallaGanadaAccesible', { nombre })}
        />
      </MedallaAcunada>
      <Animated.View entering={entradaCalma(reducir, 4)} style={styles.resultadoTextos}>
        <Texto rol="etiqueta" tono="acento" style={styles.centrado}>
          {t('aprender.ganaste')}
        </Texto>
        <Texto rol="displayGrande" accessibilityRole="header" style={styles.centrado}>
          {nombre}
        </Texto>
        <Texto rol="interfazSecundaria" tono="suave" style={styles.centrado}>
          {puntajeTexto}
        </Texto>
      </Animated.View>

      {colecciones.map((col) => (
        <Animated.View key={col.id} entering={entradaCalma(reducir)} style={styles.coleccion}>
          <Texto rol="etiqueta" tono="acento" style={styles.centrado}>
            {t('aprender.coleccionCompleta')}
          </Texto>
          <Texto rol="titulo" accessibilityRole="header" style={styles.centrado}>
            {col[idioma]}
          </Texto>
          <ColeccionCompleta nombre={col[idioma]} lecturas={lecturasDeColeccion(contenido, col)} reducir={reducir} />
        </Animated.View>
      ))}

      <Animated.View entering={entradaCalma(reducir, 6)} style={[styles.fila, styles.filaCentrada]}>
        <Boton
          variante="luz"
          texto={t('aprender.verVitrina')}
          pista={t('aprender.verVitrinaPista')}
          onPress={() => router.dismissTo('/aprender')}
        />
      </Animated.View>
    </View>
  );
}

function coleccionesDe(resultado: ResultadoQuiz | null) {
  return (resultado?.coleccionesNuevas ?? []).flatMap((id) => {
    const col = contenido.colecciones.find((c) => c.id === id);
    return col ? [col] : [];
  });
}

function NoEncontrado() {
  const { t } = useTranslation();
  const reducir = useReducirMovimiento();
  return (
    <Fondo>
      <SafeAreaView style={styles.llenar} edges={['top', 'left', 'right', 'bottom']}>
        <Animated.View entering={entradaCalma(reducir)} style={styles.vacio}>
          <Encabezado titulo={t('aprender.noEncontrada')} />
          <Texto tono="suave">{t('aprender.noEncontradaDetalle')}</Texto>
          <View style={styles.fila}>
            <Boton
              texto={t('acciones.volver')}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/aprender'))}
            />
          </View>
        </Animated.View>
      </SafeAreaView>
    </Fondo>
  );
}

const styles = StyleSheet.create({
  llenar: { flex: 1 },
  vacio: { paddingHorizontal: espaciado.xl, paddingTop: espaciado.lg, gap: espaciado.lg },
  pagina: { paddingHorizontal: espaciado.lg + 2, gap: espaciado.lg },
  volver: {
    alignSelf: 'flex-start',
    minHeight: medidas.toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xxs,
    paddingLeft: espaciado.sm,
    paddingRight: espaciado.md + 2,
    borderRadius: radios.pildora,
    borderWidth: 1,
  },
  presionado: { opacity: 0.75 },
  bloque: { gap: espaciado.md },
  barra: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs + 1, minHeight: SEGMENTO_ACTUAL },
  segmento: { flex: 1, borderRadius: SEGMENTO_ACTUAL / 2 },
  pregunta: {
    fontSize: TAMANO_PREGUNTA,
    lineHeight: interlineado(TAMANO_PREGUNTA, FACTOR_INTERLINEADO.display),
  },
  opciones: { gap: espaciado.sm + 1 },
  opcion: {
    minHeight: medidas.toqueMinimo + espaciado.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.md + 2,
    paddingHorizontal: espaciado.lg,
    borderRadius: radios.tarjeta - 6,
    borderCurve: 'continuous',
    borderWidth: 1.5,
  },
  tinte: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: radios.tarjeta - 7 },
  letra: { width: LETRA, height: LETRA, borderRadius: LETRA / 2, alignItems: 'center', justifyContent: 'center' },
  letraTexto: {
    fontFamily: familias.interfazFuerte,
    fontSize: 12,
    lineHeight: interlineado(12, FACTOR_INTERLINEADO.interfazChica),
  },
  opcionTexto: {
    flex: 1,
    fontFamily: familias.interfazSemi,
    fontSize: TAMANO_OPCION,
    lineHeight: interlineado(TAMANO_OPCION, FACTOR_INTERLINEADO.cuerpo),
  },
  explicacion: { padding: espaciado.lg, gap: espaciado.xs },
  veredicto: { fontSize: 20, lineHeight: interlineado(20, FACTOR_INTERLINEADO.display) },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  filaCentrada: { justifyContent: 'center' },
  resultado: { alignItems: 'center', gap: espaciado.md, paddingTop: espaciado.xxl },
  revelado: { width: 250, minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  resultadoTextos: { alignItems: 'center', gap: espaciado.sm },
  centrado: { textAlign: 'center' },
  lead: { maxWidth: 320 },
  coleccion: { alignItems: 'center', gap: espaciado.xs, marginTop: espaciado.lg },
});
