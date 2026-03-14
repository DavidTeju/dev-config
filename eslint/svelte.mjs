import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import {
	baseConfig,
	typeCheckedBaseConfig,
	strictRules,
	typeCheckedRules,
	typeCheckedParserOptions,
	testFileOverrides,
	typeCheckedTestOverrides,
	vitestTestOverrides,
	scriptFileOverrides
} from './base.mjs';

/**
 * Shared Svelte config pieces used by both standard and type-checked variants.
 */
function svelteSharedConfigs({ svelteConfig: svelteConf } = {}) {
	return [
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
			},
			rules: {
				// Svelte 5's $effect tracks dependencies via synchronous reads. The official
				// docs use bare statements (e.g. `messages.length;`) to declare trigger-only
				// deps, and `void val` is the common lint-safe variant of that pattern.
				// Restructuring to $derived or event handlers is preferred when possible,
				// but DOM side effects (scroll, resize) legitimately need this pattern.
				// Refs: https://svelte.dev/docs/svelte/$effect
				//       https://github.com/sveltejs/svelte/discussions/10639
				'sonarjs/void-use': 'off'
			}
		},
		{
			// SvelteKit virtual modules ($app/*, $env/*, $service-worker) can't be resolved
			// by any ESLint import resolver — they're provided by Vite at build time.
			settings: {
				'import-x/ignore': ['\\$app', '\\$env', '\\$service-worker']
			},
			rules: {
				'import-x/no-unresolved': [
					'error',
					{ ignore: ['^\\$app/', '^\\$env/', '^\\$service-worker'] }
				]
			}
		}
	];
}

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
		...svelteSharedConfigs({ svelteConfig: svelteConf }),
		strictRules,
		testFileOverrides,
		vitestTestOverrides,
		scriptFileOverrides,
		{
			ignores: ['.svelte-kit/**', 'build/**', 'node_modules/**']
		}
	);
}

/**
 * Type-checked ESLint config for SvelteKit projects.
 * Adds type-aware rules (no-floating-promises, exhaustive switches, etc.)
 * on top of the standard config. Slower but catches more bugs.
 *
 * @param {object} [options]
 * @param {object} [options.svelteConfig] - Imported svelte.config.js for parser
 * @returns {import('typescript-eslint').ConfigArray}
 */
export function svelteTypeCheckedConfig({ svelteConfig: svelteConf } = {}) {
	return ts.config(
		...typeCheckedBaseConfig,
		...svelteSharedConfigs({ svelteConfig: svelteConf }),
		typeCheckedParserOptions,
		strictRules,
		typeCheckedRules,
		testFileOverrides,
		typeCheckedTestOverrides,
		vitestTestOverrides,
		scriptFileOverrides,
		{
			ignores: ['.svelte-kit/**', 'build/**', 'node_modules/**']
		}
	);
}
