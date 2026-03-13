/**
 * ESLint config pieces for Next.js projects.
 * Re-exports strict rules, test overrides, and script overrides
 * for consumers to compose with eslint-config-next.
 *
 * Usage:
 *   import { defineConfig, globalIgnores } from 'eslint/config';
 *   import nextVitals from 'eslint-config-next/core-web-vitals';
 *   import nextTs from 'eslint-config-next/typescript';
 *   import { strictRules, testFileOverrides, scriptFileOverrides } from '@davidteju/dev-config/eslint/nextjs';
 *
 *   export default defineConfig([
 *     ...nextVitals, ...nextTs,
 *     strictRules, testFileOverrides, scriptFileOverrides,
 *     globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
 *   ]);
 */
export { strictRules, testFileOverrides, scriptFileOverrides, vitestTestOverrides } from './base.mjs';
