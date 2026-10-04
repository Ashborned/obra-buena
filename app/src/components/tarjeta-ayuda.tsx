/**
 * Tarjeta de ayuda en salud mental (CLAUDE.md, principio 6; maqueta: `care()`).
 *
 * - País con líneas (`ayudaParaPais`): nombre del país, cada línea con su nombre, número grande,
 *   detalle y botón para llamar (abre el marcador; la persona confirma), y emergencias si el país
 *   lo trae.
 * - Sin país o sin datos: respaldo Find A Helpline (el único enlace externo de la app) y el aviso
 *   de llamar al número de emergencias local. Nunca se muestra el número de otro país.
 * - Siempre: el aviso de emergencias (`respaldo.nota`) y "¿Estás en otro país?" abre el selector (`/pais`); al volver, la tarjeta ya muestra el
 *   país nuevo porque lee `usePais()`.
 *
 * Tono cálido, sin alarmar: sin rojo de alerta ni íconos de peligro. Cabecera con el tono de la
 * emoción y cuerpo de vidrio. Ningún número está escrito aquí: todo sale de `contenido.ayuda`.
 * Sin animación propia (calma).
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Boton } from '@/components/boton';
import { Enlace } from '@/components/enlace';
import { Texto } from '@/components/texto';
import { ayudaParaPais, contenido, type LineaAyuda } from '@/contenido';
import { useIdioma, useTranslation } from '@/i18n';
import { abrirMarcador, prepararLlamada, type Llamada } from '@/lib/llamar';
import { useNombrePais, usePais } from '@/lib/pais';
import {
  espaciado,
  FACTOR_INTERLINEADO,
  familias,
  interlineado,
  radios,
  useTema,
  type IdTonoEmocion,
} from '@/theme';

const TAMANO_NUMERO = 22;
const TAMANO_TITULO = 20;
const BORDE = 1.5;

/** Dominio del respaldo para el botón ("Abrir findahelpline.com"), tomado del contenido. */
function sitioDe(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

type Motivo = Extract<Llamada, { tipo: 'manual' }>['motivo'];

export function TarjetaAyuda({ emocion }: { emocion: IdTonoEmocion }) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const { emociones, superficies, colores } = useTema();
  const tono = emociones[emocion];
  const { pais } = usePais();
  const nombrePais = useNombrePais();
  const ayuda = ayudaParaPais(contenido.ayuda, pais);

  return (
    <View
      style={[
        styles.tarjeta,
        {
          backgroundColor: superficies.vidrio,
          borderColor: tono.borde,
          boxShadow: `0 10px 28px ${superficies.sombra}`,
        },
      ]}>
      <View
        style={[
          styles.cabecera,
          { backgroundColor: tono.hondo, experimental_backgroundImage: tono.degradadoMosaico },
        ]}>
        <Texto accessibilityRole="header" style={[styles.titulo, { color: tono.texto }]}>
          {t('ayuda.titulo')}
        </Texto>
        <Texto rol="interfazSecundaria" style={{ color: tono.texto }}>
          {t('ayuda.texto')}
        </Texto>
      </View>

      <View style={styles.cuerpo}>
        {ayuda.tipo === 'pais' ? (
          <>
            <Texto rol="etiqueta" tono="acento" accessibilityRole="header">
              {t('ayuda.enPais', { pais: ayuda.pais.nombre[idioma] })}
            </Texto>
            {ayuda.pais.lineas.map((linea) => (
              <FilaLinea
                key={`${linea.marcar}-${linea.nombre.es}`}
                nombre={linea.nombre[idioma]}
                detalle={linea.detalle[idioma]}
                numero={linea.numero}
                marcar={linea.marcar}
                etiquetaLlamar={t('ayuda.llamarAccesible', {
                  linea: linea.nombre[idioma],
                  numero: linea.numero,
                })}
              />
            ))}
            {ayuda.pais.emergencia ? (
              <FilaLinea
                nombre={t('ayuda.emergencias')}
                numero={ayuda.pais.emergencia}
                marcar={ayuda.pais.emergencia}
                etiquetaLlamar={t('ayuda.emergenciasAccesible', { numero: ayuda.pais.emergencia })}
              />
            ) : null}
            {/* El aviso de emergencias va siempre, traiga o no el país su número. */}
            <Texto rol="interfaz">{ayuda.respaldo.nota[idioma]}</Texto>
          </>
        ) : (
          <>
            <Texto rol="interfazSecundaria" tono="suave">
              {ayuda.pais && nombrePais(ayuda.pais) !== ayuda.pais
                ? t('ayuda.sinDatosPais', { pais: nombrePais(ayuda.pais) })
                : t('ayuda.sinDatos')}
            </Texto>
            <Texto rol="titulo" style={styles.respaldoNombre}>
              {ayuda.respaldo.nombre[idioma]}
            </Texto>
            <View style={styles.inicioFila}>
              <Boton
                variante="contorno"
                texto={t('ayuda.abrirRespaldo', { sitio: sitioDe(ayuda.respaldo.url) })}
                pista={t('ayuda.abrirRespaldoPista')}
                onPress={() => {
                  Linking.openURL(ayuda.respaldo.url).catch(() => {});
                }}
              />
            </View>
            <Texto rol="interfaz">{ayuda.respaldo.nota[idioma]}</Texto>
          </>
        )}

        <View style={[styles.separador, { borderTopColor: colores.linea }]}>
          <Enlace
            texto={t('ayuda.otroPais')}
            pista={t('ayuda.otroPaisPista')}
            onPress={() => router.push('/pais')}
          />
        </View>
      </View>
    </View>
  );
}

function FilaLinea({
  nombre,
  detalle,
  numero,
  marcar,
  etiquetaLlamar,
}: {
  nombre: string;
  detalle?: string;
  numero: LineaAyuda['numero'];
  marcar: LineaAyuda['marcar'];
  etiquetaLlamar: string;
}) {
  const { t } = useTranslation();
  const { colores } = useTema();
  // Si de antemano no se puede abrir el marcador (iPhone con * o #), se pide marcarlo a mano.
  const manualDeAntemano = prepararLlamada(marcar).tipo === 'manual';
  const [fallo, setFallo] = useState<Motivo | null>(null);

  const llamar = async () => {
    const resultado = await abrirMarcador(marcar);
    setFallo(resultado.tipo === 'manual' ? resultado.motivo : null);
  };

  return (
    <View style={[styles.linea, { borderTopColor: colores.linea }]}>
      <Texto style={styles.lineaNombre}>{nombre}</Texto>
      {detalle ? (
        <Texto rol="interfazSecundaria" tono="suave">
          {detalle}
        </Texto>
      ) : null}
      <View style={styles.numeroFila}>
        <Texto selectable style={[styles.numero, { color: colores.acentoTexto }]}>
          {numero}
        </Texto>
        {manualDeAntemano ? null : (
          <Boton
            variante="contorno"
            texto={t('ayuda.llamar')}
            etiquetaAccesible={etiquetaLlamar}
            pista={t('ayuda.llamarPista')}
            onPress={llamar}
          />
        )}
      </View>
      {manualDeAntemano || fallo ? (
        <Texto rol="interfazSecundaria" tono="suave" accessibilityLiveRegion="polite">
          {fallo === 'sin-marcador' ? t('ayuda.sinMarcador') : t('ayuda.marcarAMano')}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: BORDE,
    borderRadius: radios.tarjeta,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  cabecera: {
    paddingHorizontal: espaciado.lg,
    paddingTop: espaciado.lg - 1,
    paddingBottom: espaciado.md + 2,
    gap: espaciado.xs + 2,
  },
  titulo: {
    fontFamily: familias.displaySemi,
    fontSize: TAMANO_TITULO,
    lineHeight: interlineado(TAMANO_TITULO, FACTOR_INTERLINEADO.display),
  },
  cuerpo: {
    paddingHorizontal: espaciado.lg,
    paddingTop: espaciado.md + 2,
    paddingBottom: espaciado.xs,
    gap: espaciado.sm + 2,
  },
  linea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: espaciado.sm + 2,
    gap: espaciado.xxs,
  },
  lineaNombre: { fontFamily: familias.interfazSemi },
  numeroFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
    marginTop: espaciado.xs,
  },
  numero: {
    fontFamily: familias.interfazFuerte,
    fontSize: TAMANO_NUMERO,
    lineHeight: interlineado(TAMANO_NUMERO, FACTOR_INTERLINEADO.interfaz),
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  respaldoNombre: { marginTop: espaciado.xxs },
  inicioFila: { flexDirection: 'row' },
  separador: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: espaciado.xxs,
  },
});
