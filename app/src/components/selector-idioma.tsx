/**
 * Selector de idioma de la interfaz (Configuración y bienvenida): un grupo de radio con cada idioma
 * de `IDIOMAS` escrito en su propio idioma (clave `idioma.nombre` de cada JSON de traducción),
 * para que cualquiera reconozca el suyo aunque la app esté en otro.
 *
 * El cambio se aplica al instante (`cambiarIdioma` redibuja la interfaz) y queda guardado.
 */
import { StyleSheet, View } from 'react-native';

import { OpcionRadio } from '@/components/opcion-radio';
import { Texto } from '@/components/texto';
import { cambiarIdioma, CODIGOS_IDIOMA, IDIOMAS, useIdioma, useTranslation, type Idioma } from '@/i18n';
import { espaciado } from '@/theme';

/** Nombre del idioma en su propio idioma ("Español", "English"). */
export function nombreIdioma(codigo: Idioma): string {
  return IDIOMAS[codigo].idioma.nombre;
}

export function SelectorIdioma({
  conTitulo = true,
  alElegir,
}: {
  /** Muestra la etiqueta de sección (en la pantalla propia del selector, el título ya lo dice). */
  conTitulo?: boolean;
  /** Se llama después de elegir (p. ej. para cerrar la pantalla del selector). */
  alElegir?: (idioma: Idioma) => void;
}) {
  const { t } = useTranslation();
  const actual = useIdioma();
  const tituloSeccion = t('configuracion.idioma');

  return (
    <View style={styles.seccion}>
      {conTitulo && (
        <Texto rol="etiqueta" tono="suave" accessibilityRole="header">
          {tituloSeccion}
        </Texto>
      )}
      <View accessibilityRole="radiogroup" accessibilityLabel={tituloSeccion} style={styles.grupo}>
        {CODIGOS_IDIOMA.map((codigo) => {
          const seleccionado = codigo === actual;
          return (
            <OpcionRadio
              key={codigo}
              etiqueta={nombreIdioma(codigo)}
              seleccionada={seleccionado}
              onPress={() => {
                if (!seleccionado) void cambiarIdioma(codigo);
                alElegir?.(codigo);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: espaciado.sm },
  grupo: { gap: espaciado.sm },
});
