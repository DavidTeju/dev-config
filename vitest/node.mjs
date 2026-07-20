import path from 'path';

/**
 * Creates a base Vitest config for plain Node/TypeScript services.
 *
 * @param {object} [options]
 * @param {string} [options.rootDir] - Project root (use import.meta.dirname). When set,
 *   exposes an `@` alias pointing at `<rootDir>/src`.
 * @param {string[]} [options.include] - Test file globs.
 * @param {string[]} [options.setupFiles] - Test setup files.
 * @returns {import('vitest/config').UserConfig}
 */
export function createVitestConfig({
	rootDir,
	include = ['test/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
	setupFiles = []
} = {}) {
	return {
		test: {
			environment: 'node',
			globals: true,
			setupFiles,
			include,
			coverage: {
				provider: 'v8',
				reporter: ['text', 'json', 'html'],
				include: ['src/**/*.ts'],
				exclude: ['node_modules/', '**/*.d.ts', '**/*.config.*', 'test/**']
			}
		},
		...(rootDir ? { resolve: { alias: { '@': path.resolve(rootDir, 'src') } } } : {})
	};
}
