const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for handling .wasm files for expo-sqlite web support
config.resolver.assetExts.push('wasm');

module.exports = config;
