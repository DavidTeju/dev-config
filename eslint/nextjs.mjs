/**
 * ESLint config pieces for Next.js projects.
 * Re-exports strict rules, test overrides, and script overrides
 * for consumers to compose with eslint-config-next.
 *
 * Usage (standard):
 *   import { defineConfig, globalIgnores } from 'eslint/config';
 *   import nextVitals from 'eslint-config-next/core-web-vitals';
 *   import nextTs from 'eslint-config-next/typescript';
 *   import { strictRules, testFileOverrides, vitestTestOverrides, scriptFileOverrides } from '@davidteju/dev-config/eslint/nextjs';
 *
 *   export default defineConfig([
 *     ...nextVitals, ...nextTs,
 *     strictRules, testFileOverrides, vitestTestOverrides, scriptFileOverrides,
 *     globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
 *   ]);
 *
 * Usage (type-checked):
 *   import { strictRules, typeCheckedRules, typeCheckedParserOptions, testFileOverrides, typeCheckedTestOverrides, ... } from '@davidteju/dev-config/eslint/nextjs';
 *
 *   export default defineConfig([
 *     ...nextVitals, ...nextTs,
 *     typeCheckedParserOptions,
 *     strictRules, typeCheckedRules,
 *     testFileOverrides, typeCheckedTestOverrides, vitestTestOverrides, scriptFileOverrides,
 *     globalIgnores([...]),
 *   ]);
 */
export {
	strictRules,
	testFileOverrides,
	scriptFileOverrides,
	vitestTestOverrides,
	typeCheckedRules,
	typeCheckedParserOptions,
	typeCheckedTestOverrides
} from './base.mjs';
