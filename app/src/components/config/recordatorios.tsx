/**
 * Configuración → Recordatorios: la hora con que empiezan los avisos de cada novena y la lista de
 * novenas con avisos activos, cada una con un interruptor. Apagar cancela sus avisos; volver a encender
 * los programa de nuevo a la misma hora (pidiendo permiso si hace falta).
 *
 * - Solo se listan avisos que aún tienen días por delante (los de una novena ya terminada no hacen nada).
 * - Una fila apagada sigue en la lista mientras la pantalla está abierta, para poder volver a encenderla.
 * - Sin módulo de notificaciones (Expo Go en Android, ver lib/avisos.ts) se explica que necesitan la app
 *   instalada y no se muestra nada más.
 * - Principio 1: los avisos no cuentan nada ni hablan de rachas.
 */
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Boton } from '@/components/boton';
import { BloqueConfig, SeccionConfig } from '@/components/config/seccion';
import { Texto } from '@/components/texto';
import { contenido, type Novena } from '@/contenido';
import { useIdioma, useTranslation } from '@/i18n';
import { moduloRecordatorios } from '@/lib/avisos';
import { fechaCorta, fechaLarga, horaCorta, usa24Horas } from '@/lib/formato-fecha';
import type { EstadoNovena } from '@/lib/novenas';
import { anioDeFiesta, estadoDeNovena } from '@/lib/novenas-contenido';
import { usePais } from '@/lib/pais';
import { guardarHoraRecordatorio, leerHoraRecordatorio } from '@/lib/preferencias';
import type { Hora } from '@/lib/recordatorios';
import { useAhora } from '@/lib/use-ahora';
import { espaciado, medidas, radios, useTema } from '@/theme';

type Fila = { clave: string; novena: Novena; anio: number; hora: Hora; estado: EstadoNovena };
type Problema = 'sin-permiso' | 'sin-dias' | 'error';

export function SeccionRecordatorios({ orden }: { orden?: number }) {
  const { t } = useTranslation();
  const rec = moduloRecordatorios();
  return (
    <SeccionConfig titulo={t('configuracion.secciones.recordatorios')} orden={orden}>
      {rec ? (
        <>
          <HoraPorDefecto />
          <ListaAvisos />
        </>
      ) : (
        <Texto tono="suave">{t('configuracion.recordatorios.noDisponibles')}</Texto>
      )}
    </SeccionConfig>
  );
}

/** Hora por defecto de los avisos, con el selector nativo (diálogo en Android, rueda en iOS). */
function HoraPorDefecto() {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const { colores, superficies } = useTema();
  const [hora, setHora] = useState<Hora>(leerHoraRecordatorio);
  const [eligiendo, setEligiendo] = useState(false);
  const [temporal, setTemporal] = useState<Hora>(hora);
  const texto = horaCorta(hora.h, hora.m, idioma);

  const elegir = (h: Hora) => {
    setHora(h);
    guardarHoraRecordatorio(h);
    AccessibilityInfo.announceForAccessibility(
      t('configuracion.recordatorios.horaAccesible', { hora: horaCorta(h.h, h.m, idioma) }),
    );
  };

  return (
    <BloqueConfig>
      <Texto rol="etiqueta" tono="suave" accessibilityRole="header">
        {t('configuracion.recordatorios.horaPorDefecto')}
      </Texto>
      <Texto rol="interfazSecundaria" tono="suave">
        {t('configuracion.recordatorios.horaExplicacion')}
      </Texto>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('configuracion.recordatorios.horaAccesible', { hora: texto })}
        accessibilityHint={t('configuracion.recordatorios.horaPista')}
        accessibilityState={{ expanded: Platform.OS === 'ios' ? eligiendo : undefined }}
        onPress={() => {
          setTemporal(hora);
          setEligiendo(true);
        }}
        style={({ pressed }) => [
          styles.fila,
          { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
          pressed && styles.presionada,
        ]}>
        <Texto rol="titulo" style={styles.crece}>
          {texto}
        </Texto>
        <Texto rol="boton" tono="acento">
          {t('acciones.cambiar')}
        </Texto>
      </Pressable>

      {eligiendo && Platform.OS === 'ios' ? (
        <View style={styles.selectorIos}>
          <DateTimePicker
            mode="time"
            value={new Date(2000, 0, 1, temporal.h, temporal.m)}
            accentColor={colores.acento}
            locale={idioma}
            onValueChange={(_, d) => setTemporal({ h: d.getHours(), m: d.getMinutes() })}
          />
          <View style={styles.acciones}>
            <Boton
              variante="contorno"
              texto={t('novenas.listo')}
              onPress={() => {
                setEligiendo(false);
                elegir(temporal);
              }}
            />
            <Boton variante="contorno" texto={t('novenas.cancelar')} onPress={() => setEligiendo(false)} />
          </View>
        </View>
      ) : null}

      {/* Android: el selector de hora nativo es un diálogo; se desmonta al elegir o cancelar. */}
      {eligiendo && Platform.OS === 'android' ? (
        <DateTimePicker
          mode="time"
          presentation="dialog"
          value={new Date(2000, 0, 1, temporal.h, temporal.m)}
          is24Hour={usa24Horas(idioma)}
          accentColor={colores.acento}
          positiveButton={{ label: t('novenas.listo') }}
          negativeButton={{ label: t('novenas.cancelar') }}
          onValueChange={(_, d) => {
            setEligiendo(false);
            elegir({ h: d.getHours(), m: d.getMinutes() });
          }}
          onDismiss={() => setEligiendo(false)}
        />
      ) : null}
    </BloqueConfig>
  );
}

/** Novenas con avisos que todavía tienen días por delante este año. */
function filasIniciales(hoy: Date, pais: string | null): Fila[] {
  const rec = moduloRecordatorios();
  if (!rec) return [];
  const ahora = new Date();
  rec.olvidarRecordatoriosPasados(hoy.getFullYear());
  return rec.recordatoriosActivos().flatMap((r) => {
    const novena = contenido.novenas.find((n) => n.id === r.novena);
    if (!novena) return [];
    const { estado } = estadoDeNovena(novena, hoy, { pais, traslados: contenido.traslados });
    if (anioDeFiesta(estado) !== r.anio) return [];
    if (rec.planRecordatorios(estado, r.hora, ahora).length === 0) return [];
    return [{ clave: `${r.novena}.${r.anio}`, novena, anio: r.anio, hora: r.hora, estado }];
  });
}

function ListaAvisos() {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const { hoy } = useAhora();
  const { pais } = usePais();
  // Qué filas se muestran se decide al abrir (una fila apagada sigue a la vista para volver a
  // encenderla). Sus fechas, en cambio, se recalculan con el país actual: Configuración sigue
  // montada bajo /pais y, si no, al volver mostraba (y reprogramaba) las fechas del país anterior.
  const [iniciales] = useState(() => filasIniciales(hoy, pais));
  const filas = useMemo(
    () =>
      iniciales.map((f) => ({
        ...f,
        estado: estadoDeNovena(f.novena, hoy, { pais, traslados: contenido.traslados }).estado,
      })),
    [iniciales, hoy, pais],
  );
  const [encendidas, setEncendidas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(iniciales.map((f) => [f.clave, true])),
  );
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [problema, setProblema] = useState<Problema | null>(null);

  const opcionesAviso = (f: Fila) => {
    const nombre = f.novena[idioma];
    return {
      novena: f.novena.id,
      anio: f.anio,
      estado: f.estado,
      hora: f.hora,
      canal: t('novenas.canal'),
      textos: (dia: number) => ({
        titulo: t('novenas.aviso.titulo', { nombre, n: dia }),
        cuerpo: t('novenas.aviso.cuerpo'),
      }),
    };
  };

  // Al cambiar de país, los avisos encendidos se reprograman con las fechas nuevas (p. ej. Corpus
  // trasladado al domingo). El permiso ya estaba dado, así que no se vuelve a pedir.
  const paisAnterior = useRef(pais);
  useEffect(() => {
    if (paisAnterior.current === pais) return;
    paisAnterior.current = pais;
    const rec = moduloRecordatorios();
    if (!rec) return;
    for (const f of filas) {
      if (encendidas[f.clave]) rec.activarRecordatorios(opcionesAviso(f)).catch(() => setProblema('error'));
    }
    // Solo al cambiar de país: `filas` ya trae las fechas nuevas en ese mismo render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pais]);

  const alternar = async (f: Fila, encender: boolean) => {
    const rec = moduloRecordatorios();
    if (!rec || ocupada) return;
    setOcupada(f.clave);
    setProblema(null);
    try {
      if (!encender) {
        await rec.desactivarRecordatorios(f.novena.id, f.anio);
        setEncendidas((e) => ({ ...e, [f.clave]: false }));
        AccessibilityInfo.announceForAccessibility(t('novenas.anuncioSinAvisos'));
        return;
      }
      const r = await rec.activarRecordatorios(opcionesAviso(f));
      if (!r.ok) setProblema('sin-permiso');
      else if (r.programados === 0) setProblema('sin-dias');
      else {
        setEncendidas((e) => ({ ...e, [f.clave]: true }));
        AccessibilityInfo.announceForAccessibility(
          t('novenas.anuncioAvisos', { hora: horaCorta(f.hora.h, f.hora.m, idioma) }),
        );
      }
    } catch {
      setProblema('error');
    } finally {
      setOcupada(null);
    }
  };

  return (
    <BloqueConfig>
      <Texto rol="etiqueta" tono="suave" accessibilityRole="header">
        {t('configuracion.recordatorios.activos')}
      </Texto>
      {filas.length === 0 ? (
        <Texto tono="suave">{t('configuracion.recordatorios.ninguno')}</Texto>
      ) : (
        filas.map((f) => (
          <FilaAviso
            key={f.clave}
            fila={f}
            encendida={!!encendidas[f.clave]}
            ocupada={ocupada === f.clave}
            onCambiar={(v) => alternar(f, v)}
          />
        ))
      )}
      {problema ? (
        <View style={styles.problema}>
          <Texto accessibilityLiveRegion="polite">
            {problema === 'sin-permiso'
              ? t('novenas.sinPermiso')
              : problema === 'sin-dias'
                ? t('novenas.sinDiasPorAvisar')
                : t('novenas.errorAvisos')}
          </Texto>
          {problema === 'sin-permiso' ? (
            <View style={styles.acciones}>
              <Boton
                variante="contorno"
                texto={t('novenas.abrirAjustes')}
                onPress={() => {
                  Linking.openSettings().catch(() => {});
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </BloqueConfig>
  );
}

/**
 * Una novena con aviso: nombre, hora y fechas, y el interruptor. Toda la fila es el interruptor para el
 * lector y para el dedo (objetivo grande); el `Switch` nativo es solo el dibujo.
 */
function FilaAviso({
  fila,
  encendida,
  ocupada,
  onCambiar,
}: {
  fila: Fila;
  encendida: boolean;
  ocupada: boolean;
  onCambiar: (valor: boolean) => void;
}) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const { colores, superficies } = useTema();
  const nombre = fila.novena[idioma];
  const hora = horaCorta(fila.hora.h, fila.hora.m, idioma);
  const detalle = t('configuracion.recordatorios.detalle', {
    hora,
    inicio: fechaCorta(fila.estado.inicio, idioma),
    fin: fechaCorta(fila.estado.fin, idioma),
  });
  const detalleAccesible = t('configuracion.recordatorios.detalle', {
    hora,
    inicio: fechaLarga(fila.estado.inicio, idioma),
    fin: fechaLarga(fila.estado.fin, idioma),
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={t('configuracion.recordatorios.interruptor', { nombre })}
      accessibilityHint={detalleAccesible}
      accessibilityState={{ checked: encendida, busy: ocupada }}
      onPress={() => onCambiar(!encendida)}
      style={({ pressed }) => [
        styles.fila,
        { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
        pressed && styles.presionada,
      ]}>
      <View style={styles.crece}>
        <Texto rol="titulo">{nombre}</Texto>
        <Texto rol="interfazSecundaria" tono="suave">
          {detalle}
        </Texto>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Switch
          value={encendida}
          disabled={ocupada}
          onValueChange={onCambiar}
          trackColor={{ false: colores.textoSuave, true: colores.acento }}
          ios_backgroundColor={colores.textoSuave}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: espaciado.md,
    minHeight: medidas.toqueMinimo + espaciado.md,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
    borderRadius: radios.tarjeta,
    // Mismo grosor que las opciones de radio, para que las filas alineen.
    borderWidth: 2,
    borderCurve: 'continuous',
  },
  presionada: { opacity: 0.7 },
  crece: { flex: 1, minWidth: 160, gap: espaciado.xxs },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  selectorIos: { gap: espaciado.sm },
  problema: { gap: espaciado.sm },
});
