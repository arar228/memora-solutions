import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // ESLint can't see <motion.X> in JSX as a use of `motion`, so allow that
      // specific import name on top of capitalised identifiers.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^([A-Z_]|motion)',
        argsIgnorePattern: '^[A-Z_]|^_',
      }],
      // Preview rule that flags benign React patterns (e.g. closing a menu on
      // route change). Turn off until upstream stabilises.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Node-side scripts (build tooling, image optimizer, etc.).
    files: ['scripts/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'module',
    },
  },
])
