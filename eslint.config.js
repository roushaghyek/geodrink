// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'dist-e2e/*'],
  },
  {
    // Cloudflare Workers runtime globals.
    files: ['worker/**'],
    languageOptions: {
      globals: { WebSocketPair: 'readonly', caches: 'readonly' },
    },
  },
  {
    files: ['cypress/**'],
    languageOptions: {
      globals: { cy: 'readonly', Cypress: 'readonly', describe: 'readonly', it: 'readonly', beforeEach: 'readonly', expect: 'readonly' },
    },
  },
]);
