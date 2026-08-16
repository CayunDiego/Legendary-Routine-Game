import js from '@eslint/js';
import globals from 'globals';

/* El objetivo principal de esta config es no-undef: al partir el monolito en
   módulos, una función que quedó del otro lado de la frontera y no se importó
   deja de ser un error silencioso del navegador y pasa a fallar acá. */
export default [
  {
    ignores: ['dist/**', 'legacy/**', 'node_modules/**', 'smoke.mjs'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
];
