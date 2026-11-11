import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import ts from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import regexp from 'eslint-plugin-regexp';
import sonarjs from 'eslint-plugin-sonarjs';
import importX from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import unusedImports from 'eslint-plugin-unused-imports';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import n from 'eslint-plugin-n';
import globals from 'globals';
import { mustUseResult } from './rules/must-use-result.mjs';
import { noThrow } from './rules/no-throw.mjs';

/** Glob patterns that identify test and benchmark files. */
const testFilePatterns = [
	'**/__tests__/**/*.{ts,tsx}',
	'**/*.{test,spec}.{ts,tsx}',
	'**/benchmark/**/*.{ts,tsx}'
];

/**
 * The only files allowed to cast (`unchecked.ts`) or throw (`panic.ts`). Keeping each escape
 * hatch in one named file makes every use of it greppable, like Rust's `unsafe` and `panic!`.
 */
const uncheckedFilePatterns = ['**/unchecked.{ts,tsx}'];
const panicFilePatterns = ['**/panic.{ts,tsx,js,mjs}'];

/** This package's own rules. */
const ownPlugin = { rules: { 'must-use-result': mustUseResult, 'no-throw': noThrow } };

/**
 * Build Svelte-specific config objects.
 * Extracted to keep createConfig readable.
 */
function buildSvelteConfigs(svelte, svelteConf) {
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
 * Creates a complete ESLint flat config array.
 *
 * @param {object} [options]
 * @param {'svelte' | 'nextjs'} [options.framework] - Framework-specific config
 * @param {boolean} [options.typeChecked=true] - Type-aware rules, including the throw ban and
 *   must-use-result. Pass false only where type information is unavailable.
 * @param {object} [options.svelteConfig] - Imported svelte.config.js (Svelte only)
 * @returns {Promise<import('typescript-eslint').ConfigArray>}
 */
export async function createConfig(options = {}) {
	const { framework, typeChecked = true, svelteConfig: svelteConf } = options;

	// --- Validation ---
	if (svelteConf && framework !== 'svelte') {
		throw new Error(
			'svelteConfig option requires framework: "svelte". ' +
				'Either add framework: "svelte" or remove svelteConfig.'
		);
	}

	const config = [];

	// === 1. Base plugin configs (always) ===
	config.push(
		js.configs.recommended,
		...(typeChecked ? ts.configs.recommendedTypeChecked : ts.configs.recommended),
		regexp.configs['flat/recommended'],
		sonarjs.configs.recommended,
		importX.flatConfigs.recommended,
		importX.flatConfigs.typescript,
		n.configs['flat/recommended'],
		// Tune n plugin for our stack
		{
			settings: {
				node: { version: '>=24.0.0' }
			},
			rules: {
				// Redundant with import-x/no-unresolved + TypeScript resolver
				'n/no-missing-import': 'off',
				'n/no-missing-require': 'off',
				// Full-stack projects serve browser code; browser globals (localStorage,
				// fetch, crypto) are not Node builtins and will always false-positive.
				'n/no-unsupported-features/node-builtins': 'off'
			}
		},
		prettierConfig
	);

	// === 2. Framework configs (conditional, dynamically imported) ===
	if (framework === 'svelte') {
		let svelte;
		try {
			svelte = (await import('eslint-plugin-svelte')).default;
		} catch {
			throw new Error(
				'framework: "svelte" requires eslint-plugin-svelte.\n' +
					'Install it: npm install -D eslint-plugin-svelte'
			);
		}
		config.push(...buildSvelteConfigs(svelte, svelteConf));
	} else if (framework === 'nextjs') {
		let nextVitals, nextTs;
		try {
			[nextVitals, nextTs] = await Promise.all([
				import('eslint-config-next/core-web-vitals'),
				import('eslint-config-next/typescript')
			]);
		} catch {
			throw new Error(
				'framework: "nextjs" requires eslint-config-next.\n' +
					'Install it: npm install -D eslint-config-next'
			);
		}
		config.push(
			...(Array.isArray(nextVitals.default) ? nextVitals.default : [nextVitals.default]),
			...(Array.isArray(nextTs.default) ? nextTs.default : [nextTs.default])
		);
	}

	// === 3. Type-checked parser options ===
	if (typeChecked) {
		config.push({
			languageOptions: {
				parserOptions: {
					projectService: true
				}
			}
		});
	}

	// === 4. Strict rules (always) ===
	config.push({
		plugins: {
			prettier: prettierPlugin,
			'unused-imports': unusedImports,
			'@davidteju': ownPlugin,
			'@stylistic': stylistic
		},
		settings: {
			'import-x/resolver-next': [createTypeScriptImportResolver()]
		},
		rules: {
			'prettier/prettier': 'error',

			// Blank lines Prettier will not add: each step and its check read as a paragraph
			'@stylistic/padding-line-between-statements': [
				'error',
				{ blankLine: 'always', prev: 'if', next: '*' },
				{ blankLine: 'any', prev: 'if', next: 'if' },
				{ blankLine: 'always', prev: '*', next: 'return' }
			],

			// Import hygiene
			'import-x/no-cycle': ['error', { maxDepth: 5 }],
			'import-x/no-self-import': 'error',
			'import-x/no-useless-path-segments': 'error',
			'import-x/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
					'newlines-between': 'never',
					alphabetize: { order: 'asc', caseInsensitive: true }
				}
			],

			// Unused imports (auto-fixable) + unused vars
			'@typescript-eslint/no-unused-vars': 'off',
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

			// SonarJS tuning (recommended rules are already on via base config)
			'sonarjs/cognitive-complexity': ['warn', 15],
			'sonarjs/no-duplicate-string': ['warn', { threshold: 4 }],

			// TypeScript strictness
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			// No casts: narrow with a check instead (`as const` stays allowed)
			'@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],

			// Code quality
			complexity: ['warn', { max: 15 }],
			'no-nested-ternary': 'error',
			'no-param-reassign': ['error', { props: false }],
			'no-console': ['warn', { allow: ['warn', 'error'] }],

			// Security
			'no-eval': 'error',
			'no-implied-eval': 'error',

			// No magic numbers — force named constants for clarity
			'no-magic-numbers': [
				'error',
				{
					detectObjects: false,
					enforceConst: true,
					ignore: [0, 1, -1, 2],
					ignoreArrayIndexes: true
				}
			]
		}
	});

	// === 5. Type-checked rules ===
	if (typeChecked) {
		config.push({
			rules: {
				// No throw; only enforced where dropped Results are caught too
				'@davidteju/no-throw': 'error',
				'@davidteju/must-use-result': 'error',
				'@typescript-eslint/no-floating-promises': 'error',
				'@typescript-eslint/no-misused-promises': 'error',
				'@typescript-eslint/no-unnecessary-condition': 'warn',
				'@typescript-eslint/no-unnecessary-type-assertion': 'error',
				'@typescript-eslint/switch-exhaustiveness-check': 'error',
				'@typescript-eslint/no-deprecated': 'warn',
				'@typescript-eslint/prefer-nullish-coalescing': 'error',
				'@typescript-eslint/prefer-optional-chain': 'warn',
				'logical-assignment-operators': [
					'error',
					'always',
					{
						enforceForIfStatements: true
					}
				]
			}
		});
	}

	// === 6. Overrides (always) ===

	// The two escape hatches: unchecked.ts may cast, panic.ts may throw
	config.push(
		{
			files: uncheckedFilePatterns,
			rules: {
				'@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as' }]
			}
		},
		{
			files: panicFilePatterns,
			rules: { '@davidteju/no-throw': 'off' }
		}
	);

	// Test file overrides — relaxed rules for tests
	config.push({
		files: testFilePatterns,
		rules: {
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@davidteju/no-throw': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/consistent-type-assertions': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'no-console': 'off',
			'no-magic-numbers': 'off',
			'sonarjs/no-duplicate-string': 'off',
			'sonarjs/cognitive-complexity': 'off',
			'sonarjs/no-nested-functions': 'off',
			'import-x/no-cycle': 'off'
		}
	});

	// Type-checked test overrides
	if (typeChecked) {
		config.push({
			files: testFilePatterns,
			rules: {
				'@typescript-eslint/no-unnecessary-condition': 'off',
				'@typescript-eslint/no-unnecessary-type-assertion': 'off',
				'@typescript-eslint/switch-exhaustiveness-check': 'off',
				'@typescript-eslint/prefer-optional-chain': 'off'
			}
		});
	}

	// Vitest test overrides (dynamic — optional peer dep)
	try {
		const vitestPlugin = await import('@vitest/eslint-plugin');
		config.push({
			files: testFilePatterns,
			plugins: {
				vitest: vitestPlugin.default
			},
			rules: {
				'vitest/expect-expect': 'error',
				'vitest/no-conditional-in-test': 'error',
				'vitest/no-conditional-expect': 'error',
				'vitest/no-disabled-tests': 'error'
			}
		});
	} catch {
		// @vitest/eslint-plugin not installed — skip vitest rules
	}

	// Catch .only left in tests
	config.push({
		files: testFilePatterns,
		plugins: {
			'no-only-tests': noOnlyTests
		},
		rules: {
			'no-only-tests/no-only-tests': 'error'
		}
	});

	// Script file overrides — relaxed for CLI scripts and tooling
	config.push({
		files: ['scripts/**/*.ts'],
		rules: {
			'no-console': 'off',
			'@davidteju/no-throw': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'no-nested-ternary': 'off',
			complexity: 'off',
			'no-magic-numbers': 'off',
			'sonarjs/no-duplicate-string': 'off',
			'sonarjs/cognitive-complexity': 'off',
			'import-x/no-cycle': 'off',
			'n/no-process-exit': 'off'
		}
	});

	// === 7. Framework ignores ===
	if (framework === 'nextjs') {
		config.push({ ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'] });
	} else if (framework === 'svelte') {
		config.push({ ignores: ['.svelte-kit/**', 'build/**', 'node_modules/**'] });
	}

	return config;
}
