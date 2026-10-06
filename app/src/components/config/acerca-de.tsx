/**
 * Configuración → Acerca de: versión, traducciones bíblicas, créditos de imágenes, política de
 * privacidad y contacto.
 *
 * - Créditos: solo se muestran si hay imágenes en `assets/manifiesto.json` (hoy no hay).
 * - Política de privacidad y contacto aún no existen: se ven como texto con "Próximamente", nunca
 *   como un enlace que no lleva a ninguna parte.
 */
import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';

import { BloqueConfig, SeccionConfig } from '@/components/config/seccion';
import { Texto } from '@/components/texto';
import { useTranslation } from '@/i18n';
import { creditosImagenes } from '@/lib/creditos';
import { espaciado, familias } from '@/theme';

export function SeccionAcercaDe({ orden }: { orden?: number }) {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version;
  const creditos = creditosImagenes();

  return (
    <SeccionConfig titulo={t('configuracion.secciones.acercaDe')} orden={orden}>
      <Dato titulo={t('app.nombre')} texto={version ? t('configuracion.acercaDe.version', { version }) : undefined} />
      <Dato titulo={t('configuracion.acercaDe.biblia')} texto={t('configuracion.acercaDe.bibliaDetalle')} />

      {creditos.length > 0 ? (
        <BloqueConfig>
          <Texto rol="etiqueta" tono="suave" accessibilityRole="header">
            {t('configuracion.acercaDe.imagenes')}
          </Texto>
          {creditos.map((c) => (
            <Texto key={c.id} rol="interfazSecundaria">
              {t('configuracion.acercaDe.credito', {
                obra: c.obra,
                autor: c.autor,
                anio: c.anio,
                licencia: c.licencia,
              })}
            </Texto>
          ))}
        </BloqueConfig>
      ) : null}

      <Dato titulo={t('configuracion.acercaDe.privacidad')} texto={t('configuracion.acercaDe.proximamente')} />
      <Dato titulo={t('configuracion.acercaDe.contacto')} texto={t('configuracion.acercaDe.proximamente')} />
    </SeccionConfig>
  );
}

/** Título y texto, leídos juntos por el lector. Sin aspecto de enlace. */
function Dato({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <View accessible accessibilityLabel={texto ? `${titulo}. ${texto}` : titulo} style={styles.dato}>
      <Texto rol="interfaz" style={styles.fuerte}>
        {titulo}
      </Texto>
      {texto ? (
        <Texto rol="interfazSecundaria" tono="suave">
          {texto}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dato: { gap: espaciado.xxs },
  fuerte: { fontFamily: familias.interfazSemi },
});
