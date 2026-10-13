const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    // jest.mock factories are hoisted above imports and must load modules with require().
    files: ['jest-setup.ts', '**/__tests__/**'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    ignores: ['node_modules/*', 'ios/*', 'android/*', 'reports/*', 'ralph-kontrole/*', '.expo/*'],
  },
]);
