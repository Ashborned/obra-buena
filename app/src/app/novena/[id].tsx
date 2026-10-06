/**
 * Detalle de una novena (prototype/obra-buena.html, `state.tab` de novenas, vista detalle): Volver,
 * nombre, fechas (empieza, termina, fiesta), estado, las nueve velas grandes para elegir el día, la
 * oración del día elegido, "Recé hoy" y "Avísame cada día".
 *
 * Vive fuera de las pestañas, como el detalle de una emoción: es una pantalla de oración y se reza
 * sin la barra a la vista (una cosa por pantalla). Entra con fundido. Se abre con `rutaNovena(id)`.
 *
 * Principio 1: las velas son un registro personal. Sin rachas, puntos, contadores ni "¡bien hecho!".
 * Solo se marcan días que ya llegaron (o el de hoy): marcar un día futuro sería anotar una oración
 * que todavía no se rezó. La maqueta lo permitía; aquí ese día muestra cuándo se podrá marcar.
 *
 * Movimiento: encender una vela y completar los nueve días son nivel 1 (en `VelasNovena`, con
 * `vibrar('vela')` y `vibrar('novenaCompleta')` cuando lo hace la persona); son estallidos únicos que
 * terminan. El resto es calma: nada se repite (las llamas quedan quietas) y la oración no se anima
 * mientras se lee: al cambiar de día entra con un fundido.
 * Día de la fiesta: tarjeta de celebración y, si se completó la novena, las nueve velas encendidas
 * con el latido y la columna de luz una vez al abrir (sin vibrar: nadie tocó nada).
 */
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/components/boton';
import { Encabezado } from '@/components/encabezado';
import { Fondo } from '@/components/fondo';
import { Icono } from '@/components/icono';
import { Tarjeta } from '@/components/tarjeta';
import { Texto } from '@/components/texto';
import { VelasNovena } from '@/components/velas-novena';
import { contenido, MODO_CONTENIDO, type Novena } from '@/contenido';
import { useIdioma, useTranslation } from '@/i18n';
import { useReducirMovimiento } from '@/lib/animaciones';
import { fechaCorta, fechaLarga, horaCorta, usa24Horas } from '@/lib/formato-fecha';
import { anioDeFiesta, estadoDeNovena, oracionDelDia } from '@/lib/novenas-contenido';
import { sumarDias } from '@/lib/novenas';
import { usePais } from '@/lib/pais';
import { leerHoraRecordatorio } from '@/lib/preferencias';
import { moduloRecordatorios } from '@/lib/avisos';
import { apagarVela, encenderVela, velasEncendidas } from '@/lib/progreso';
import type { Hora } from '@/lib/recordatorios';
import { useAhora } from '@/lib/use-ahora';
import { useVibracion } from '@/lib/vibracion';
import { conAlfa, espaciado, interlineado, medidas, radios, useTema } from '@/theme';
import { entradaCalma, fundido } from '@/theme/movimiento';

/** Oración (`.prayertext`: 16.5 / 1.6). */
const TAMANO_ORACION = 16.5;
/** Datos de fechas (`.facts span`: 600 12.5). */
const TAMANO_DATO = 12.5;
const TODOS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type AvisoProblema = 'sin-permiso' | 'sin-dias' | 'error' | null;

export default function PantallaNovena() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const novena = contenido.novenas.find((n) => n.id === id);
  if (!novena) return <NoEncontrada />;
  // Una novena distinta empieza con su propio estado (día elegido, velas, avisos).
  return <Detalle key={novena.id} novena={novena} />;
}

function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/novenas');
}

function Detalle({ novena }: { novena: Novena }) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const reducir = useReducirMovimiento();
  const vibrar = useVibracion();
  const insets = useSafeAreaInsets();
  const { paleta, superficies, colores } = useTema();
  const { hoy } = useAhora();
  const { pais } = usePais();

  const { estado } = useMemo(
    () => estadoDeNovena(novena, hoy, { pais, traslados: contenido.traslados }),
    [novena, hoy, pais],
  );
  const anio = anioDeFiesta(estado);
  const nombre = novena[idioma];
  /** Último día que ya llegó: el de hoy; el 9 el día de la fiesta; 0 antes de empezar. */
  const ultimoLlegado = estado.esFiesta ? 9 : (estado.dia ?? 0);

  // Velas ------------------------------------------------------------------------------------
  const [encendidas, setEncendidas] = useState<number[] | null>(null);
  const [elegido, setElegido] = useState(() => estado.dia ?? (estado.esFiesta ? 9 : 1));
  const [recien, setRecien] = useState<number | null>(null);
  const [celebrar, setCelebrar] = useState(0);
  const celebroFiesta = useRef(false);

  useEffect(() => {
    let vigente = true;
    velasEncendidas(novena.id, anio)
      .then((dias) => {
        if (!vigente) return;
        setEncendidas(dias);
        // Día de la fiesta con la novena completa: la celebración, una vez al abrir.
        if (estado.esFiesta && dias.length >= 9 && !celebroFiesta.current) {
          celebroFiesta.current = true;
          setCelebrar((c) => c + 1);
        }
      })
      .catch(() => {
        if (vigente) setEncendidas([]);
      });
    return () => {
      vigente = false;
    };
  }, [novena.id, anio, estado.esFiesta]);

  const completa = (encendidas?.length ?? 0) >= 9;
  const velas = estado.esFiesta && completa ? TODOS : (encendidas ?? []);
  const elegidoEncendido = velas.includes(elegido);
  const elegidoLlego = elegido <= ultimoLlegado;

  const alternarVela = async () => {
    if (!encendidas || !elegidoLlego) return;
    const dia = elegido;
    const estaba = encendidas.includes(dia);
    const nuevas = estaba ? encendidas.filter((d) => d !== dia) : [...encendidas, dia].sort((a, b) => a - b);
    setEncendidas(nuevas);
    setRecien(estaba ? null : dia);
    if (!estaba) {
      // La llama nace: un toque blando. Si con ella se completan los nueve días, la segunda
      // vibración llega con el latido y la columna de luz (`alCompletar`, después de que la llama nace).
      vibrar('vela');
      if (nuevas.length >= 9) setCelebrar((c) => c + 1);
    }
    AccessibilityInfo.announceForAccessibility(
      t(estaba ? 'novenas.anuncioApagada' : 'novenas.anuncioEncendida', { n: dia }),
    );
    try {
      if (estaba) await apagarVela(novena.id, anio, dia);
      else await encenderVela(novena.id, anio, dia);
    } catch {
      // No se pudo guardar: la vela vuelve a como estaba.
      setEncendidas(encendidas);
      setRecien(null);
    }
  };

  // Recordatorios ----------------------------------------------------------------------------
  // Sin módulo (Expo Go en Android, ver lib/avisos.ts) la sección no aparece.
  const rec = moduloRecordatorios();
  // Hora inicial del aviso: la elegida en Configuración (08:00 si nunca se eligió).
  const [horaDefecto] = useState<Hora | undefined>(() => (rec ? leerHoraRecordatorio() : undefined));
  const [hora, setHora] = useState<Hora | null>(() => rec?.recordatorioActivo(novena.id, anio) ?? null);
  const [problema, setProblema] = useState<AvisoProblema>(null);
  const [eligiendoHora, setEligiendoHora] = useState(false);
  const [horaTemporal, setHoraTemporal] = useState<Hora | null>(hora ?? horaDefecto ?? null);
  const [ocupado, setOcupado] = useState(false);
  // Sin días por delante (fiesta, o el día 9 pasada la hora), no se ofrece "Avísame cada día".
  const quedanDias = !!rec && !!horaDefecto && rec.planRecordatorios(estado, horaDefecto, new Date()).length > 0;
  const mostrarAvisos = !!rec && !estado.esFiesta && (hora !== null || quedanDias);

  const activar = async (h: Hora) => {
    setOcupado(true);
    try {
      if (!rec) return;
      const r = await rec.activarRecordatorios({
        novena: novena.id,
        anio,
        estado,
        hora: h,
        canal: t('novenas.canal'),
        textos: (dia) => ({
          titulo: t('novenas.aviso.titulo', { nombre, n: dia }),
          cuerpo: t('novenas.aviso.cuerpo'),
        }),
      });
      if (!r.ok) {
        setProblema('sin-permiso');
      } else if (r.programados === 0) {
        setHora(null);
        setProblema('sin-dias');
      } else {
        setHora(h);
        setProblema(null);
        AccessibilityInfo.announceForAccessibility(
          t('novenas.anuncioAvisos', { hora: horaCorta(h.h, h.m, idioma) }),
        );
      }
    } catch {
      setProblema('error');
    } finally {
      setOcupado(false);
    }
  };

  const desactivar = async () => {
    setOcupado(true);
    try {
      await rec?.desactivarRecordatorios(novena.id, anio);
      setHora(null);
      setProblema(null);
      setEligiendoHora(false);
      AccessibilityInfo.announceForAccessibility(t('novenas.anuncioSinAvisos'));
    } catch {
      setProblema('error');
    } finally {
      setOcupado(false);
    }
  };

  const abrirSelector = () => {
    setHoraTemporal(hora ?? horaDefecto ?? null);
    setEligiendoHora(true);
  };

  // Textos ------------------------------------------------------------------------------------
  const estadoTexto = estado.esFiesta
    ? t('novenas.esSuFiesta')
    : estado.dia !== null
      ? t('novenas.diaDe', { n: estado.dia })
      : t('novenas.empiezaEn', { count: estado.faltan });
  const oracion = oracionDelDia(novena, elegido, MODO_CONTENIDO);
  const textoOracion =
    oracion.tipo === 'oracion'
      ? oracion.oracion[idioma]
      : oracion.tipo === 'marcador'
        ? t('novenas.oracionMarcador', { n: elegido, nombre })
        : t('novenas.oracionProximamente');
  const fechaDiaElegido = sumarDias(estado.inicio, elegido - 1);
  const esHoyElegido = estado.dia === elegido;

  const datos = [
    { texto: t('novenas.empieza', { fecha: fechaCorta(estado.inicio, idioma) }), accesible: t('novenas.empiezaAccesible', { fecha: fechaLarga(estado.inicio, idioma) }) },
    { texto: t('novenas.termina', { fecha: fechaCorta(estado.fin, idioma) }), accesible: t('novenas.terminaAccesible', { fecha: fechaLarga(estado.fin, idioma) }) },
    { texto: t('novenas.fiesta', { fecha: fechaCorta(estado.fiesta, idioma) }), accesible: t('novenas.fiestaAccesible', { fecha: fechaLarga(estado.fiesta, idioma) }) },
  ];

  return (
    <Fondo>
      <ScrollView
        contentContainerStyle={[
          styles.pagina,
          { paddingTop: insets.top + espaciado.sm, paddingBottom: insets.bottom + espaciado.xxxl },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('acciones.volver')}
          onPress={volver}
          hitSlop={espaciado.xs}
          style={({ pressed }) => [
            styles.volver,
            { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
            pressed && styles.presionado,
          ]}>
          <Icono nombre="volver" color={colores.texto} tamano={medidas.iconoBoton - 3} />
          <Texto rol="boton">{t('acciones.volver')}</Texto>
        </Pressable>

        <Animated.View entering={entradaCalma(reducir)} style={styles.bloque}>
          <Encabezado titulo={nombre} />
          <View style={styles.datos}>
            {datos.map((d) => (
              <View
                key={d.texto}
                accessible
                accessibilityLabel={d.accesible}
                style={[styles.dato, { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde }]}>
                <Texto style={styles.datoTexto}>{d.texto}</Texto>
              </View>
            ))}
          </View>
        </Animated.View>

        {estado.esFiesta ? (
          <Animated.View entering={entradaCalma(reducir, 1)}>
            <Tarjeta
              style={[
                styles.relleno,
                {
                  borderColor: conAlfa(paleta.glow, 0.7),
                  experimental_backgroundImage: `linear-gradient(135deg, ${conAlfa(paleta.glow, 0.32)}, ${superficies.vidrio} 70%)`,
                  boxShadow: `0 10px 30px ${conAlfa(paleta.glow, 0.35)}`,
                },
              ]}>
              <Texto rol="etiqueta" tono="acento" accessibilityRole="header">
                {t('novenas.esSuFiesta')}
              </Texto>
              <Texto rol="titulo">{fechaLarga(estado.fiesta, idioma)}</Texto>
              <Texto tono="suave">{t('novenas.fiestaTexto')}</Texto>
            </Tarjeta>
          </Animated.View>
        ) : (
          <Animated.View entering={entradaCalma(reducir, 1)}>
            <Texto rol="interfazSecundaria" tono="suave">
              {`${estadoTexto}. ${t('novenas.tocaUnaVela')}`}
            </Texto>
          </Animated.View>
        )}
        {estado.esFiesta ? (
          <Texto rol="interfazSecundaria" tono="suave">
            {t('novenas.tocaUnaVela')}
          </Texto>
        ) : null}

        <Animated.View entering={entradaCalma(reducir, 2)}>
          <Tarjeta style={styles.tarjetaVelas}>
            {encendidas ? (
              <VelasNovena
                encendidas={velas}
                diaActual={estado.dia}
                elegido={elegido}
                onElegir={setElegido}
                recienEncendida={recien}
                celebrar={celebrar}
                alCompletar={() => vibrar('novenaCompleta')}
                reducir={reducir}
              />
            ) : (
              <View style={styles.velasCargando} />
            )}
          </Tarjeta>
        </Animated.View>

        <Animated.View entering={entradaCalma(reducir, 3)}>
          <Tarjeta style={styles.relleno}>
            <Texto rol="etiqueta" tono="acento" accessibilityRole="header">
              {t('novenas.diaDe', { n: elegido })}
            </Texto>
            {/* Al cambiar de día, la oración nueva entra con un fundido (sin moverse). */}
            <Animated.View key={elegido} entering={fundido.entrada()}>
              <Texto style={[styles.oracion, oracion.tipo !== 'oracion' && { color: colores.textoSuave }]}>
                {textoOracion}
              </Texto>
            </Animated.View>
          </Tarjeta>
        </Animated.View>

        <Animated.View entering={entradaCalma(reducir, 4)} style={styles.bloque}>
          {encendidas && elegidoLlego ? (
            <View style={styles.inicioFila}>
              <Boton
                // Se vuelve a montar al cambiar de variante: en Android, cambiar el degradado de fondo
                // de una vista ya dibujada tumbó Expo Go (IllegalArgumentException en LinearGradient).
                key={elegidoEncendido ? 'rezado' : 'rezar'}
                variante={elegidoEncendido ? 'fantasma' : 'luz'}
                texto={
                  elegidoEncendido
                    ? t('novenas.rezado')
                    : esHoyElegido
                      ? t('novenas.receHoy')
                      : t('novenas.receEsteDia')
                }
                etiquetaAccesible={elegidoEncendido ? t('novenas.rezadoAccesible', { n: elegido }) : undefined}
                pista={t(elegidoEncendido ? 'novenas.apagarPista' : 'novenas.encenderPista', { n: elegido })}
                estadoAccesible={{ checked: elegidoEncendido }}
                onPress={alternarVela}
              />
            </View>
          ) : encendidas ? (
            <Texto tono="suave">{t('novenas.diaFuturo', { fecha: fechaLarga(fechaDiaElegido, idioma) })}</Texto>
          ) : null}

          {mostrarAvisos ? (
            hora ? (
              <Tarjeta style={styles.relleno}>
                <View style={styles.filaAviso}>
                  <Icono nombre="novenas" color={colores.acentoTexto} tamano={medidas.iconoBoton - 3} />
                  <Texto style={styles.textoAviso}>
                    {t('novenas.teAvisaremos', { hora: horaCorta(hora.h, hora.m, idioma) })}
                  </Texto>
                </View>
                <View style={styles.acciones}>
                  <Boton
                    variante="contorno"
                    texto={t('novenas.cambiarHora')}
                    pista={t('novenas.cambiarHoraPista')}
                    onPress={ocupado ? () => {} : abrirSelector}
                  />
                  <Boton
                    variante="contorno"
                    texto={t('novenas.desactivar')}
                    onPress={ocupado ? () => {} : desactivar}
                  />
                </View>
                {eligiendoHora && horaTemporal && Platform.OS === 'ios' ? (
                  <View style={styles.selectorIos}>
                    <Texto rol="etiqueta" tono="suave">
                      {t('novenas.elegirHora')}
                    </Texto>
                    <DateTimePicker
                      mode="time"
                      value={new Date(2000, 0, 1, horaTemporal.h, horaTemporal.m)}
                      accentColor={colores.acento}
                      locale={idioma}
                      onValueChange={(_, d) => setHoraTemporal({ h: d.getHours(), m: d.getMinutes() })}
                    />
                    <View style={styles.acciones}>
                      <Boton
                        variante="contorno"
                        texto={t('novenas.listo')}
                        onPress={() => {
                          setEligiendoHora(false);
                          if (horaTemporal) activar(horaTemporal);
                        }}
                      />
                      <Boton variante="contorno" texto={t('novenas.cancelar')} onPress={() => setEligiendoHora(false)} />
                    </View>
                  </View>
                ) : null}
              </Tarjeta>
            ) : (
              <View style={styles.inicioFila}>
                <Boton
                  texto={t('novenas.avisame')}
                  pista={t('novenas.avisamePista')}
                  estadoAccesible={{ checked: false, busy: ocupado }}
                  onPress={ocupado || !horaDefecto ? () => {} : () => activar(horaDefecto)}
                />
              </View>
            )
          ) : null}

          {problema ? (
            <Tarjeta style={styles.relleno}>
              <Texto accessibilityLiveRegion="polite">
                {problema === 'sin-permiso'
                  ? t('novenas.sinPermiso')
                  : problema === 'sin-dias'
                    ? t('novenas.sinDiasPorAvisar')
                    : t('novenas.errorAvisos')}
              </Texto>
              {problema === 'sin-permiso' ? (
                <View style={styles.inicioFila}>
                  <Boton
                    variante="contorno"
                    texto={t('novenas.abrirAjustes')}
                    onPress={() => {
                      Linking.openSettings().catch(() => {});
                    }}
                  />
                </View>
              ) : null}
            </Tarjeta>
          ) : null}
        </Animated.View>
      </ScrollView>

      {/* Android: el selector de hora nativo es un diálogo; se desmonta al elegir o cancelar. */}
      {eligiendoHora && horaTemporal && Platform.OS === 'android' ? (
        <DateTimePicker
          mode="time"
          presentation="dialog"
          value={new Date(2000, 0, 1, horaTemporal.h, horaTemporal.m)}
          is24Hour={usa24Horas(idioma)}
          accentColor={colores.acento}
          positiveButton={{ label: t('novenas.listo') }}
          negativeButton={{ label: t('novenas.cancelar') }}
          onValueChange={(_, d) => {
            setEligiendoHora(false);
            activar({ h: d.getHours(), m: d.getMinutes() });
          }}
          onDismiss={() => setEligiendoHora(false)}
        />
      ) : null}
    </Fondo>
  );
}

function NoEncontrada() {
  const { t } = useTranslation();
  const reducir = useReducirMovimiento();
  return (
    <Fondo>
      <SafeAreaView style={styles.llenar} edges={['top', 'left', 'right', 'bottom']}>
        <Animated.View entering={entradaCalma(reducir)} style={styles.vacio}>
          <Encabezado titulo={t('novenas.noEncontrada')} />
          <Texto tono="suave">{t('novenas.noEncontradaDetalle')}</Texto>
          <View style={styles.inicioFila}>
            <Boton texto={t('acciones.volver')} onPress={volver} />
          </View>
        </Animated.View>
      </SafeAreaView>
    </Fondo>
  );
}

const styles = StyleSheet.create({
  llenar: { flex: 1 },
  vacio: { paddingHorizontal: espaciado.xl, paddingTop: espaciado.lg, gap: espaciado.lg },
  pagina: { paddingHorizontal: espaciado.lg + 2, gap: espaciado.md + 2 },
  bloque: { gap: espaciado.md },
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
  presionado: { opacity: 0.7 },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm - 2 },
  dato: {
    paddingVertical: espaciado.xs + 2,
    paddingHorizontal: espaciado.md - 1,
    borderRadius: radios.pildora,
    borderWidth: 1,
  },
  datoTexto: {
    fontSize: TAMANO_DATO,
    lineHeight: interlineado(TAMANO_DATO, 1.3),
    fontVariant: ['tabular-nums'],
  },
  tarjetaVelas: {
    paddingTop: espaciado.xl + 2,
    paddingHorizontal: espaciado.md,
    paddingBottom: espaciado.md,
  },
  velasCargando: { height: 140 },
  relleno: { padding: espaciado.lg, gap: espaciado.sm },
  oracion: {
    fontSize: TAMANO_ORACION,
    lineHeight: interlineado(TAMANO_ORACION, 1.6),
  },
  inicioFila: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  filaAviso: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  textoAviso: { flexShrink: 1 },
  selectorIos: { gap: espaciado.sm, marginTop: espaciado.xs },
});
