import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Mirrors the studio-api delivery-repo config (Phase 08 D-055): each repo owns
// its gate set. `@typescript-eslint/no-explicit-any` is an error to keep the
// "no `any`" delivery rule enforced in CI.
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/generated/**',
      '.agents/**',
      '.agent/**',
      'agent references to learn from/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
  },
  prettier,
);
