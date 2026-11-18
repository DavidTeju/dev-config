import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { createConfig } from '../eslint/config.mjs';

test('ESLint leaves formatting to the formatter while retaining declaration spacing', async () => {
	const lint = new ESLint({
		overrideConfigFile: true,
		overrideConfig: await createConfig({ typeChecked: false })
	});
	const config = await lint.calculateConfigForFile('example.ts');
	assert.equal(config.plugins.prettier, undefined);
	assert.equal(config.rules['prettier/prettier'], undefined);
	const [result] = await lint.lintText('export const first=1;\nexport const second=2;\n', {
		filePath: 'example.ts'
	});
	assert.ok(
		result.messages.some(({ ruleId }) => ruleId === '@stylistic/padding-line-between-statements')
	);
});

test('shared Oxfmt presets format TypeScript, Svelte, Markdown and JSON without sorting imports or package keys', async () => {
	const { default: base } = await import('@davidteju/dev-config/oxfmt/base');
	const { default: svelte } = await import('@davidteju/dev-config/oxfmt/svelte');
	const { default: nextjs } = await import('@davidteju/dev-config/oxfmt/nextjs');
	const { format } = await import('oxfmt');
	assert.equal(nextjs.sortTailwindcss, true);
	for (const [filename, source, options, expected] of [
		[
			'sample.ts',
			'import z from "z";\nimport a from "a";\nconst value={z,a};',
			base,
			"import z from 'z';\nimport a from 'a';\nconst value = { z, a };\n"
		],
		['package.json', '{"z":1,"a":2}', base, '{\n\t"z": 1,\n\t"a": 2\n}\n'],
		['sample.md', '#  Title\n\n-   item', base, '# Title\n\n- item\n'],
		[
			'sample.svelte',
			'<script lang="ts">let name="Ori";</script><p class="text-red-500 flex">{name}</p>',
			svelte,
			'<script lang="ts">\n\tlet name = \'Ori\';\n</script>\n\n<p class="flex text-red-500">{name}</p>\n'
		]
	]) {
		const result = await format(filename, source, options);
		assert.deepEqual(result.errors, [], filename);
		assert.equal(result.code, expected, filename);
		assert.equal((await format(filename, result.code, options)).code, result.code, filename);
	}
});

test('staged files use Oxfmt alongside ESLint', async () => {
	for (const preset of ['node', 'svelte', 'nextjs']) {
		const { default: config } = await import(`../lint-staged/${preset}.mjs`);
		const commands = Object.values(config).flat();
		assert.ok(commands.some((command) => command.startsWith('oxfmt --write')));
		assert.ok(commands.includes('eslint --fix'));
		assert.ok(commands.every((command) => !command.includes('prettier')));
	}
});

test('a commit containing only a lockfile skips formatting successfully', async () => {
	const { default: config } = await import('../lint-staged/node.mjs');
	const command = Object.values(config)
		.flat()
		.find((value) => value.startsWith('oxfmt '));
	const [binary, ...args] = command.split(' ');
	const before = readFileSync('package-lock.json', 'utf8');
	execFileSync(`node_modules/.bin/${binary}`, [...args, 'package-lock.json'], { stdio: 'pipe' });
	assert.equal(readFileSync('package-lock.json', 'utf8'), before);
});
