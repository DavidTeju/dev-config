import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import { baseConfig, strictRules, testFileOverrides, scriptFileOverrides } from './base.mjs';

/**
 * Complete ESLint config for SvelteKit projects.
 * Composes base + Svelte plugin + globals + strict rules + ignores.
 *
 * @param {object} [options]
 * @param {object} [options.svelteConfig] - Imported svelte.config.js for parser
 * @returns {import('typescript-eslint').ConfigArray}
 */
export function svelteConfig({ svelteConfig: svelteConf } = {}) {
	return ts.config(
		...baseConfig,
		...svelte.configs.recommended,
		{
			languageOptions: {
				globals: {
					...globals.browser,
					...globals.node
				}
			}
		},
		{
			files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
			languageOptions: {
				parserOptions: {
					extraFileExtensions: ['.svelte'],
					parser: ts.parser,
					...(svelteConf ? { svelteConfig: svelteConf } : {})
				}
			}
		},
		strictRules,
		testFileOverrides,
		scriptFileOverrides,
		{
			ignores: ['.svelte-kit/**', 'build/**', 'node_modules/**']
		}
	);
}
