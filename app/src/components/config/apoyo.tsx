/**
 * Configuración → Apoyar la app (docs/apoyo.md). Es el único lugar de la app donde aparece.
 *
 * - Explicación transparente de lo que cubren los aportes; aportar **no desbloquea nada** (principio 3).
 * - Botones de aporte del servicio (`lib/apoyo.ts`). En desarrollo, el simulado lleva una marca visible
 *   "Compra simulada"; sin tienda conectada no hay botones, solo "Pronto podrás aportar desde la tienda".
 * - Al aportar: un gracias sencillo, sin insignias. Cancelar no muestra nada. Nada se guarda.
 * - "Con el apoyo de…" solo si el contenido trae un patrocinio; con `url`, abre el navegador.
 */
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Linking, StyleSheet, View } from 'react-native';

import { Boton } from '@/components/boton';
import { Chip } from '@/components/chip';
import { SeccionConfig } from '@/components/config/seccion';
import { Enlace } from '@/components/enlace';
import { Texto } from '@/components/texto';
import { contenido } from '@/contenido';
import { useIdioma, useTranslation, type ClaveTexto } from '@/i18n';
import { servicioApoyo, type Aporte, type IdAporte } from '@/lib/apoyo';
import { espaciado } from '@/theme';

const NOMBRES: Record<IdAporte, ClaveTexto> = {
  apoyo_pequeno: 'configuracion.apoyo.aportes.apoyo_pequeno',
  apoyo_mediano: 'configuracion.apoyo.aportes.apoyo_mediano',
  apoyo_grande: 'configuracion.apoyo.aportes.apoyo_grande',
};

type Mensaje = 'gracias' | 'error' | 'noDisponible';

const MENSAJES: Record<Mensaje, ClaveTexto> = {
  gracias: 'configuracion.apoyo.gracias',
  error: 'configuracion.apoyo.error',
  noDisponible: 'configuracion.apoyo.noDisponible',
};

export function SeccionApoyo({ orden }: { orden?: number }) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const servicio = useMemo(() => servicioApoyo(), []);
  /** `null` mientras se consultan los aportes. */
  const [aportes, setAportes] = useState<Aporte[] | null>(null);
  const [ocupado, setOcupado] = useState<IdAporte | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const patrocinio = contenido.patrocinio;

  useEffect(() => {
    let vigente = true;
    servicio
      .aportes()
      .then((a) => {
        if (vigente) setAportes(a);
      })
      .catch(() => {
        if (vigente) setAportes([]);
      });
    return () => {
      vigente = false;
    };
  }, [servicio]);

  const aportar = async (id: IdAporte) => {
    if (ocupado) return;
    setOcupado(id);
    setMensaje(null);
    let resultado: Mensaje | null;
    try {
      const r = await servicio.aportar(id);
      resultado = r === 'gracias' ? 'gracias' : r === 'cancelado' ? null : r === 'no_disponible' ? 'noDisponible' : 'error';
    } catch {
      resultado = 'error';
    }
    setOcupado(null);
    setMensaje(resultado);
    if (resultado) AccessibilityInfo.announceForAccessibility(t(MENSAJES[resultado]));
  };

  return (
    <SeccionConfig titulo={t('configuracion.secciones.apoyo')} orden={orden}>
      <View style={styles.textos}>
        <Texto>{t('configuracion.apoyo.gratis', { app: t('app.nombre') })}</Texto>
        <Texto>{t('configuracion.apoyo.costos')}</Texto>
        <Texto>{t('configuracion.apoyo.nadaSeDesbloquea')}</Texto>
      </View>

      {aportes === null ? null : aportes.length === 0 ? (
        <Texto tono="suave">{t('configuracion.apoyo.pronto')}</Texto>
      ) : (
        <View style={styles.aportes}>
          {servicio.simulado ? (
            <View style={styles.inicio}>
              <Chip texto={t('configuracion.apoyo.simulada')} />
            </View>
          ) : null}
          <View style={styles.botones}>
            {aportes.map((a) => {
              const texto = t('configuracion.apoyo.botonAporte', {
                nombre: t(NOMBRES[a.id]),
                precio: a.precio ?? t('configuracion.apoyo.montoPorDefinir'),
              });
              return (
                <Boton
                  key={a.id}
                  variante="contorno"
                  texto={texto}
                  pista={servicio.simulado ? t('configuracion.apoyo.simulada') : undefined}
                  estadoAccesible={{ busy: ocupado === a.id }}
                  onPress={() => aportar(a.id)}
                />
              );
            })}
          </View>
        </View>
      )}

      {mensaje ? (
        <Texto rol={mensaje === 'gracias' ? 'titulo' : 'interfaz'}>
          {t(MENSAJES[mensaje])}
        </Texto>
      ) : null}

      {patrocinio ? (
        patrocinio.url ? (
          <Enlace
            texto={t('configuracion.apoyo.patrocinio', { nombre: patrocinio.nombre[idioma] })}
            icono="externo"
            pista={t('configuracion.apoyo.patrocinioPista')}
            onPress={() => {
              if (patrocinio.url) Linking.openURL(patrocinio.url).catch(() => {});
            }}
          />
        ) : (
          <Texto tono="suave">{t('configuracion.apoyo.patrocinio', { nombre: patrocinio.nombre[idioma] })}</Texto>
        )
      ) : null}
    </SeccionConfig>
  );
}

const styles = StyleSheet.create({
  textos: { gap: espaciado.sm },
  aportes: { gap: espaciado.md },
  inicio: { flexDirection: 'row' },
  botones: { gap: espaciado.sm },
});
