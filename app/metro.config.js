// Metro: además del proyecto, vigila /content (fuente única del contenido, fuera de /app).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '..', 'content')];

module.exports = config;
