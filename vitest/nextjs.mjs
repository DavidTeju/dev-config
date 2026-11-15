import react from '@vitejs/plugin-react';
import path from 'path';
import { POLL_TIMEOUT_FLOOR_MS } from './poll-floor.mjs';

/**
 * Creates a base Vitest config for Next.js projects.
 *
 * @param {object} options
 * @param {string} options.rootDir - Project root (use import.meta.dirname)
 * @param {string[]} [options.setupFiles] - Test setup files
 * @param {Record<string, string>} [options.env] - Additional env vars for tests
 * @returns {import('vitest/config').UserConfig}
 */
export function createVitestConfig({ rootDir, setupFiles = [], env = {} }) {
	return {
		plugins: [react()],
		test: {
			environment: 'jsdom',
			globals: true,
			// Vitest's 1 s default fails on a busy machine; see poll-floor.mjs
			expect: { poll: { timeout: POLL_TIMEOUT_FLOOR_MS } },
			setupFiles,
			include: ['src/**/*.{test,spec}.{ts,tsx}'],
			env,
			coverage: {
				provider: 'v8',
				reporter: ['text', 'json', 'html'],
				exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*']
			}
		},
		resolve: {
			alias: {
				'@': path.resolve(rootDir, 'src')
			}
		}
	};
}
