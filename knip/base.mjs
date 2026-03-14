/**
 * Base Knip config shared across all projects.
 * Provides sensible defaults for dead code detection.
 *
 * Usage in consuming project's knip.ts:
 *   import { baseKnipConfig } from '@davidteju/dev-config/knip/base';
 *   export default { ...baseKnipConfig };
 */
export const baseKnipConfig = {
	ignore: ['**/*.d.ts'],
	ignoreDependencies: [
		// dev-config bundles these — consumers don't import them directly
		'@eslint/js',
		'eslint-config-prettier',
		'eslint-import-resolver-typescript',
		'eslint-plugin-import-x',
		'eslint-plugin-prettier',
		'eslint-plugin-regexp',
		'eslint-plugin-sonarjs',
		'globals',
		'typescript-eslint'
	]
};
