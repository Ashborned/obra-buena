// Metro: además del proyecto, vigila /content (fuente única del contenido, fuera de /app)
// y /assets (manifiesto de imágenes con sus créditos; más adelante, las pinturas).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '..', 'content'),
  path.resolve(__dirname, '..', 'assets'),
];

module.exports = config;
