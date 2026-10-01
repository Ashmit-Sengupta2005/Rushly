// ESLint 9+ "flat config" — replaces .eslintrc.cjs, which ESLint 10 no longer reads.
// Same rules as before: eslint:recommended + typescript-eslint recommended + prettier.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  // Prisma client is generated code — never lint it
  globalIgnores(['dist', 'src/generated', 'load-tests']),
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended, prettier],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // `_`-prefixed = intentionally unused (e.g. Express error handlers must
      // declare all 4 params, including `_next`, to be recognised as such)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // `declare global { namespace Express { ... } }` is THE way to augment Express types
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
]);
