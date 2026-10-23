import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  { files: ['public/**/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['scripts/**', 'tests/**', '*.config.*'], languageOptions: { globals: globals.node } },
];
