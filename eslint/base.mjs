import js from '@eslint/js';
import ts from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import regexp from 'eslint-plugin-regexp';
import sonarjs from 'eslint-plugin-sonarjs';
import importX from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

/**
 * Base ESLint configs: JS recommended + TS recommended + Prettier compat.
 * Use as spread in ts.config() or defineConfig().
 */
export const baseConfig = [
	js.configs.recommended,
	...ts.configs.recommended,
	regexp.configs['flat/recommended'],
	sonarjs.configs.recommended,
	importX.flatConfigs.recommended,
	importX.flatConfigs.typescript,
	prettierConfig
];

/**
 * Type-checked base config: adds type-aware TS rules on top of baseConfig.
 * Requires parserOptions.projectService to be set by the consumer.
 * Use as spread in ts.config() or defineConfig().
 */
export const typeCheckedBaseConfig = [
	js.configs.recommended,
	...ts.configs.recommendedTypeChecked,
	regexp.configs['flat/recommended'],
	sonarjs.configs.recommended,
	importX.flatConfigs.recommended,
	importX.flatConfigs.typescript,
	prettierConfig
];

/**
 * Strict rules shared across all projects.
 * Includes Prettier enforcement, TypeScript strictness, code quality, and security.
 */
export const strictRules = {
	plugins: {
		prettier: prettierPlugin
	},
	settings: {
		'import-x/resolver-next': [createTypeScriptImportResolver()]
	},
	rules: {
		'prettier/prettier': 'error',

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

		// SonarJS tuning (recommended rules are already on via baseConfig)
		'sonarjs/cognitive-complexity': ['warn', 15],
		'sonarjs/no-duplicate-string': ['warn', { threshold: 4 }],

		// TypeScript strictness
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/consistent-type-imports': 'error',
		'@typescript-eslint/no-non-null-assertion': 'error',
		'@typescript-eslint/no-explicit-any': 'error',
		'@typescript-eslint/consistent-type-assertions': [
			'error',
			{
				assertionStyle: 'as',
				objectLiteralTypeAssertions: 'allow-as-parameter'
			}
		],

		// Code quality
		complexity: ['warn', { max: 15 }],
		'no-nested-ternary': 'error',
		'no-param-reassign': ['error', { props: false }],
		'no-console': ['warn', { allow: ['warn', 'error'] }],

		// Security
		'no-eval': 'error',
		'no-implied-eval': 'error',

		// Ban unsafe type assertions
		'no-restricted-syntax': [
			'error',
			{
				selector: 'TSAsExpression[typeAnnotation.type="TSAnyKeyword"]',
				message:
					'Avoid `as any` type assertion. Use proper type guards or fix underlying types instead.'
			},
			{
				selector: 'TSAsExpression > TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]',
				message:
					'Avoid `as unknown as X` double cast. Use proper type guards or fix underlying types instead.'
			}
		],

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
};

/**
 * Parser options for type-checked linting.
 * Add this as a languageOptions config object when using typeCheckedBaseConfig.
 */
export const typeCheckedParserOptions = {
	languageOptions: {
		parserOptions: {
			projectService: true
		}
	}
};

/**
 * Additional strict rules that require type information.
 * Only usable with typeCheckedBaseConfig + typeCheckedParserOptions.
 */
export const typeCheckedRules = {
	rules: {
		// Catch unhandled promises — a common source of silent failures
		'@typescript-eslint/no-floating-promises': 'error',
		'@typescript-eslint/no-misused-promises': 'error',

		// Catch always-true/false conditions and redundant code
		'@typescript-eslint/no-unnecessary-condition': 'warn',
		'@typescript-eslint/no-unnecessary-type-assertion': 'error',

		// Ensure switch statements handle all union members
		'@typescript-eslint/switch-exhaustiveness-check': 'error',

		// Flag deprecated APIs
		'@typescript-eslint/no-deprecated': 'warn',

		// Prefer modern operators where type-safe
		'@typescript-eslint/prefer-nullish-coalescing': 'warn',
		'@typescript-eslint/prefer-optional-chain': 'warn'
	}
};

/** Glob patterns that identify test and benchmark files. */
export const testFilePatterns = [
	'**/__tests__/**/*.{ts,tsx}',
	'**/*.{test,spec}.{ts,tsx}',
	'**/benchmark/**/*.{ts,tsx}'
];

/**
 * Relaxed overrides for test and benchmark files.
 * Disables strict type rules that conflict with mocking/fixtures.
 */
export const testFileOverrides = {
	files: testFilePatterns,
	rules: {
		'@typescript-eslint/no-non-null-assertion': 'off',
		'no-restricted-syntax': 'off', // Tests need Date for fixtures and fake timers
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/consistent-type-assertions': 'off',
		// Relax type safety rules for tests (mocks often require any and type casts)
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-unsafe-return': 'off',
		'@typescript-eslint/no-unsafe-argument': 'off',
		'no-console': 'off', // Allow console in tests for debugging
		'no-magic-numbers': 'off',
		// Tests legitimately have duplicate strings (assertions), high complexity (setup), etc.
		'sonarjs/no-duplicate-string': 'off',
		'sonarjs/cognitive-complexity': 'off',
		'sonarjs/no-nested-functions': 'off',
		'import-x/no-cycle': 'off'
	}
};

/**
 * Relaxed overrides for type-checked rules in test files.
 * Use alongside testFileOverrides when using typeCheckedBaseConfig.
 */
export const typeCheckedTestOverrides = {
	files: testFilePatterns,
	rules: {
		// Keep no-floating-promises ON — unawaited promises in tests cause silent passes
		// Keep no-misused-promises ON — same category of silent test failures
		// Keep no-deprecated ON — tests should migrate off deprecated APIs too
		'@typescript-eslint/no-unnecessary-condition': 'off',
		'@typescript-eslint/no-unnecessary-type-assertion': 'off',
		'@typescript-eslint/switch-exhaustiveness-check': 'off',
		'@typescript-eslint/prefer-nullish-coalescing': 'off',
		'@typescript-eslint/prefer-optional-chain': 'off'
	}
};

/**
 * Vitest-specific test overrides.
 * Requires @vitest/eslint-plugin as a peer dependency.
 * Use alongside testFileOverrides for projects that use vitest.
 */
export const vitestTestOverrides = await (async () => {
	try {
		const vitestPlugin = await import('@vitest/eslint-plugin');
		return {
			files: testFilePatterns,
			plugins: {
				vitest: vitestPlugin.default
			},
			rules: {
				// Ban if statements inside test bodies — they create "zombie tests" that
				// silently pass without verifying anything. Use explicit assertions instead.
				'vitest/no-conditional-in-test': 'error',
				'vitest/no-conditional-expect': 'error'
			}
		};
	} catch {
		// @vitest/eslint-plugin not installed — skip vitest rules
		return {};
	}
})();

/**
 * Relaxed overrides for CLI scripts and tooling files.
 */
export const scriptFileOverrides = {
	files: ['scripts/**/*.ts'],
	rules: {
		'no-console': 'off',
		'no-restricted-syntax': 'off', // Scripts can use raw Date, etc.
		'@typescript-eslint/no-non-null-assertion': 'off',
		'no-nested-ternary': 'off',
		complexity: 'off',
		'no-magic-numbers': 'off',
		'sonarjs/no-duplicate-string': 'off',
		'sonarjs/cognitive-complexity': 'off',
		'import-x/no-cycle': 'off'
	}
};
