import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { promisify } from 'node:util';

const root = path.resolve(import.meta.dirname, '..');

/**
 * The files `npm pack` would put in a package's tarball: what a project installing it gets.
 * @param {string[]} args
 */
async function packed(...args) {
	const { stdout } = await promisify(execFile)('npm', ['pack', '--dry-run', '--json', ...args], {
		cwd: root
	});
	const [report] = JSON.parse(stdout);

	return report.files.map((/** @type {{ path: string }} */ file) => file.path);
}

describe('what each package ships', () => {
	it('dev-config ships its configs and none of the result package or its own tests', async () => {
		const files = await packed();
		assert.ok(files.includes('eslint/config.mjs'));
		assert.ok(files.includes('oxfmt/base.mjs'));
		assert.ok(files.includes('oxfmt/svelte.mjs'));
		assert.ok(files.includes('oxfmt/nextjs.mjs'));
		assert.ok(!files.some((file) => file.startsWith('prettier/')));
		assert.ok(files.includes('tsconfig/strict.json'));
		assert.deepEqual(
			files.filter((file) => /^(packages|test)\/|\.tgz$/.test(file)),
			[]
		);
	});

	it('@davidteju/result ships its built JavaScript and types, not its sources or tests', async () => {
		const files = await packed('--workspace', '@davidteju/result');
		assert.ok(files.includes('dist/index.js'));
		assert.ok(files.includes('dist/zod.d.ts'));
		assert.deepEqual(
			files.filter((file) => /^(src|tests)\//.test(file)),
			[]
		);
	});
});
