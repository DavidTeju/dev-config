import js from '@eslint/js';
import ts from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

/**
 * Base ESLint configs: JS recommended + TS recommended + Prettier compat.
 * Use as spread in ts.config() or defineConfig().
 */
export const baseConfig = [js.configs.recommended, ...ts.configs.recommended, prettierConfig];

/**
 * Strict rules shared across all projects.
 * Includes Prettier enforcement, TypeScript strictness, code quality, and security.
 */
export const strictRules = {
	plugins: {
		prettier: prettierPlugin
	},
	rules: {
		'prettier/prettier': 'error',

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
		]
	}
};

/**
 * Relaxed overrides for test and benchmark files.
 * Disables strict type rules that conflict with mocking/fixtures.
 */
export const testFileOverrides = {
	files: ['**/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}', '**/benchmark/**/*.{ts,tsx}'],
	rules: {
		'@typescript-eslint/no-non-null-assertion': 'off',
		'no-restricted-syntax': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/consistent-type-assertions': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-unsafe-return': 'off',
		'@typescript-eslint/no-unsafe-argument': 'off',
		'no-console': 'off'
	}
};

/**
 * Relaxed overrides for CLI scripts and tooling files.
 */
export const scriptFileOverrides = {
	files: ['scripts/**/*.ts'],
	rules: {
		'no-console': 'off',
		'no-restricted-syntax': 'off',
		'@typescript-eslint/no-non-null-assertion': 'off',
		'no-nested-ternary': 'off',
		complexity: 'off'
	}
};
