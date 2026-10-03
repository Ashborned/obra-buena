/**
 * Primer párrafo de una historia con letra capital gótica (UnifrakturMaguntia), como
 * `.story-p.first::first-letter` de la maqueta.
 *
 * React Native no tiene `float`: se mide en qué carácter terminan las primeras líneas junto a la
 * capital (`onTextLayout`) y el resto del párrafo sigue debajo a todo el ancho. Se vuelve a medir
 * si cambia el ancho o la letra del sistema. El lector de pantalla lee el párrafo entero de una vez.
 */
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type TextStyle } from 'react-native';

import { Texto } from '@/components/texto';
import { espaciado, useTema } from '@/theme';

/** Mínimo de líneas junto a la capital. */
const LINEAS_MINIMAS = 2;
/** Fracción de línea que se acepta de hueco bajo la capital antes de sumar otra línea al lado. */
const TOLERANCIA_LINEA = 0.15;

type Medida = { clave: string; corte: number };

export function ParrafoCapitular({ texto, estilo }: { texto: string; estilo: TextStyle }) {
  const { colores } = useTema();
  const { fontScale } = useWindowDimensions();
  const [ancho, setAncho] = useState(0);
  const [altoCapital, setAltoCapital] = useState(0);
  const [medida, setMedida] = useState<Medida | null>(null);

  const inicial = texto.charAt(0);
  const resto = texto.slice(1);
  const clave = `${ancho}|${altoCapital}|${fontScale}|${texto}`;
  const corte = medida?.clave === clave ? medida.corte : null;

  return (
    <View
      accessible
      accessibilityLabel={texto}
      onLayout={(e) => setAncho(Math.round(e.nativeEvent.layout.width))}>
      <View style={styles.fila} importantForAccessibility="no-hide-descendants">
        <Texto
          rol="capitular"
          onLayout={(e) => setAltoCapital(Math.round(e.nativeEvent.layout.height))}
          style={[styles.capital, { color: colores.oro }]}>
          {inicial}
        </Texto>
        <View style={styles.columna}>
          <Texto
            // Se vuelve a montar al cambiar la medida para que onTextLayout se dispare otra vez.
            key={clave}
            style={estilo}
            onTextLayout={(e) => {
              if (corte !== null || !ancho || !altoCapital) return;
              const lineas = e.nativeEvent.lines;
              const altoLinea = lineas[0]?.height || 1;
              // Hacia arriba: las líneas de al lado deben cubrir la capital (si no, queda un hueco debajo).
              const n = Math.max(LINEAS_MINIMAS, Math.ceil(altoCapital / altoLinea - TOLERANCIA_LINEA));
              const largo = lineas.slice(0, n).reduce((suma, l) => suma + l.text.length, 0);
              setMedida({ clave, corte: Math.min(largo, resto.length) });
            }}>
            {corte === null ? resto : resto.slice(0, corte)}
          </Texto>
        </View>
      </View>
      {corte !== null && corte < resto.length ? (
        <Texto style={estilo} importantForAccessibility="no">
          {resto.slice(corte).trimStart()}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start' },
  capital: { paddingRight: espaciado.sm + 2 },
  columna: { flex: 1 },
});
