import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { ESLint } from 'eslint';
import { createConfig } from '../eslint/config.mjs';

test('separates declarations and class methods while keeping fields and overloads together', async () => {
	const config = await createConfig();
	const rules = new Set([
		'@stylistic/padding-line-between-statements',
		'@stylistic/lines-between-class-members'
	]);
	const options = {
		cwd: path.join(import.meta.dirname, 'fixtures/project'),
		overrideConfigFile: true,
		overrideConfig: config
	};
	const source = `const limit = 1;
export function first() {}
export function second() {}
type Key = string;
interface Value { key: Key }
export class Cache {
	#first = 1;
	#second = 2;
	constructor() {}
	read(): number;
	read(value: number): number;
	read(value?: number) { return value ?? this.#first; }
	write() {}
}
`;
	const lint = new ESLint(options);
	const [before] = await lint.lintText(source, { filePath: 'src/spacing.ts' });
	assert.ok(before.messages.some((m) => m.ruleId === '@stylistic/lines-between-class-members'));
	assert.ok(before.messages.some((m) => m.ruleId === '@stylistic/padding-line-between-statements'));
	const [fixed] = await new ESLint({ ...options, fix: true }).lintText(source, {
		filePath: 'src/spacing.ts'
	});
	assert.ok(fixed.output.includes('first() {}\n\nexport function second'));
	assert.ok(fixed.output.includes('#second = 2;\n\n\tconstructor'));
	assert.ok(fixed.output.includes('constructor() {}\n\n\tread():'));
	assert.ok(
		fixed.output.includes('read(): number;\n\tread(value: number): number;\n\tread(value?:')
	);
	const [after] = await lint.lintText(fixed.output, { filePath: 'src/spacing.ts' });
	assert.deepEqual(
		after.messages.filter((m) => rules.has(m.ruleId)),
		[]
	);
});
