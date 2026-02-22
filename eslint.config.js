// eslint.config.js for ESLint v9+
import importPlugin from 'eslint-plugin-import';
export default [
  {
    plugins: {
      import: importPlugin
    },
    rules: {
      'import/no-unresolved': ['error', { caseSensitive: true }]
    },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly'
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    }
  }
];
