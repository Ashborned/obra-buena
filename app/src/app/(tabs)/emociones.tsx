/**
 * Emociones (prototype/obra-buena.html, `state.tab==='feel'`, vista lista): "¿Cómo te sientes hoy?",
 * el texto guía y los 12 mosaicos con el tono de cada emoción. Cada mosaico nombra al santo compañero
 * de la entrada de hoy (con "Otra oración" de esta sesión, si se tocó). Tocar abre el detalle
 * (`app/emocion/[id].tsx`).
 *
 * Pantalla de oración: calma (nivel 3). Solo fundido + subida de 10 px al entrar; nada se repite.
 * Con letra muy grande la grilla pasa a una columna para que ningún nombre se corte.
 */
import { router } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { MosaicoEmocion } from '@/components/mosaico-emocion';
import { Pantalla } from '@/components/pantalla';
import { Texto } from '@/components/texto';
import { contenido, type Emocion } from '@/contenido';
import { useIdioma, useTranslation } from '@/i18n';
import { entradaDelDia } from '@/lib/emociones';
import { useOtraOracion } from '@/lib/otra-oracion';
import { rutaEmocion } from '@/lib/rutas-emociones';
import { useAhora } from '@/lib/use-ahora';
import { esIdTonoEmocion, espaciado } from '@/theme';
import { entradaCalma } from '@/theme/movimiento';

/** Desde esta escala de letra los nombres largos ("Confundida") no caben en media pantalla. */
const ESCALA_UNA_COLUMNA = 1.5;
/** Separación entre mosaicos (`.tiles` gap 10). */
const SEPARACION = espaciado.sm + 2;

export default function PantallaEmociones() {
  const { t } = useTranslation();
  const reducir = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const { hoy } = useAhora();
  const columnas = fontScale >= ESCALA_UNA_COLUMNA ? 1 : 2;

  const emociones = contenido.emociones.filter((e) => esIdTonoEmocion(e.id));
  const filas: Emocion[][] = [];
  for (let i = 0; i < emociones.length; i += columnas) filas.push(emociones.slice(i, i + columnas));

  return (
    <Pantalla titulo={t('emociones.titulo')}>
      <Animated.View entering={entradaCalma(reducir)}>
        <Texto rol="interfazSecundaria" tono="suave" style={styles.guia}>
          {t('emociones.guia')}
        </Texto>
      </Animated.View>
      <Animated.View entering={entradaCalma(reducir, 1)} style={styles.grilla}>
        {filas.map((fila) => (
          <View key={fila.map((e) => e.id).join('-')} style={styles.fila}>
            {fila.map((emocion) => (
              <Mosaico key={emocion.id} emocion={emocion} hoy={hoy} />
            ))}
            {/* Última fila incompleta: un hueco para que el mosaico conserve su ancho. */}
            {fila.length < columnas ? <View style={styles.hueco} /> : null}
          </View>
        ))}
      </Animated.View>
    </Pantalla>
  );
}

function Mosaico({ emocion, hoy }: { emocion: Emocion; hoy: Date }) {
  const idioma = useIdioma();
  const [desplazamiento] = useOtraOracion(emocion.id, hoy);
  const delDia = entradaDelDia(emocion, hoy, desplazamiento);
  if (!esIdTonoEmocion(emocion.id)) return null;

  return (
    <MosaicoEmocion
      id={emocion.id}
      nombre={emocion[idioma]}
      santo={delDia ? delDia.entrada.c[idioma][0] : null}
      onPress={() => router.push(rutaEmocion(emocion.id))}
    />
  );
}

const styles = StyleSheet.create({
  // `.lead`: ancho de lectura cómodo (~34 caracteres).
  guia: { maxWidth: 340 },
  grilla: { gap: SEPARACION },
  fila: { flexDirection: 'row', gap: SEPARACION },
  hueco: { flex: 1 },
});
