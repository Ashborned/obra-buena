/**
 * Archivos de fuente para `useFonts` (expo-font). Se importa cada peso por separado para no
 * empaquetar los que no se usan. Las claves deben coincidir con `familias` en tipografia.ts.
 */
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond/500Medium_Italic';
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond/600SemiBold';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { Literata_400Regular } from '@expo-google-fonts/literata/400Regular';
import { UnifrakturMaguntia_400Regular } from '@expo-google-fonts/unifrakturmaguntia/400Regular';

import { familias } from './tipografia';

export const archivosDeFuentes = {
  [familias.displaySemi]: CormorantGaramond_600SemiBold,
  [familias.displayItalica]: CormorantGaramond_500Medium_Italic,
  [familias.lectura]: Literata_400Regular,
  [familias.interfaz]: Figtree_400Regular,
  [familias.interfazMedia]: Figtree_500Medium,
  [familias.interfazSemi]: Figtree_600SemiBold,
  [familias.interfazFuerte]: Figtree_700Bold,
  [familias.capitular]: UnifrakturMaguntia_400Regular,
};
