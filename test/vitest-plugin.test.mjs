import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadVitestPlugin } from '../eslint/vitest-plugin.mjs';

const plugin = { rules: {} };
/** The error Node gives an import of a package that is not installed. */
const notInstalled = () => {
	const error = new Error("Cannot find package '@vitest/eslint-plugin' imported from config.mjs");
	Object.assign(error, { code: 'ERR_MODULE_NOT_FOUND' });

	return Promise.reject(error);
};

describe('the Vitest lint plugin', () => {
	it('loads when installed', async () => {
		const loaded = await loadVitestPlugin({
			importPlugin: () => Promise.resolve({ default: plugin }),
			hasVitest: () => true
		});
		assert.equal(loaded, plugin);
	});

	it('is skipped in a project without Vitest', async () => {
		assert.equal(
			await loadVitestPlugin({ importPlugin: notInstalled, hasVitest: () => false }),
			undefined
		);
	});

	it('fails loudly when Vitest is installed but its lint plugin is not, so its rules never drop silently', async () => {
		await assert.rejects(
			loadVitestPlugin({ importPlugin: notInstalled, hasVitest: () => true }),
			/npm install -D @vitest\/eslint-plugin/
		);
	});

	it('fails loudly, with the cause, when the plugin is installed but will not load', async () => {
		const broken = new SyntaxError('Unexpected token in @vitest/eslint-plugin');
		await assert.rejects(
			loadVitestPlugin({ importPlugin: () => Promise.reject(broken), hasVitest: () => false }),
			(error) => error.cause === broken && /installed but did not load/.test(error.message)
		);
	});

	it('fails loudly when a package the plugin imports is missing, even without Vitest', async () => {
		const missingDependency = () => {
			const error = new Error(
				"Cannot find package '@typescript-eslint/utils' imported from " +
					'/x/node_modules/@vitest/eslint-plugin/dist/index.js'
			);
			Object.assign(error, { code: 'ERR_MODULE_NOT_FOUND' });

			return Promise.reject(error);
		};
		await assert.rejects(
			loadVitestPlugin({ importPlugin: missingDependency, hasVitest: () => false }),
			/installed but did not load/
		);
	});
});
