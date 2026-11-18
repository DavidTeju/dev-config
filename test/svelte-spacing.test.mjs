import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { createConfig } from '../eslint/config.mjs';

test('enforces the shared spacing inside both Svelte script blocks', async () => {
	const source = `<script module lang="ts">
export type State = { selected: string };
export const primary = 'primary';
</script>

<script lang="ts">
let state = $state<State>();
function received(value: State): void {
	state = value;
}
async function refresh(): Promise<void> {
	received(await Promise.resolve({ selected: primary }));
}
const selected = $derived(state?.selected);
</script>

<p>{selected}</p>
`;
	const config = await createConfig({ framework: 'svelte', typeChecked: false });
	const options = {
		cwd: path.resolve(import.meta.dirname, '..'),
		overrideConfigFile: true,
		overrideConfig: config
	};
	const lint = new ESLint(options);
	const filePath = 'test/fixtures/Settings.svelte';
	const [before] = await lint.lintText(source, { filePath });
	const spacing = before.messages.filter((m) => m.ruleId?.includes('padding'));
	assert.deepEqual(
		before.messages.filter((m) => m.fatal),
		[]
	);
	assert.deepEqual(
		spacing.map((m) => m.line),
		[3, 8, 11, 14]
	);
	const [fixed] = await new ESLint({ ...options, fix: true }).lintText(source, { filePath });
	assert.match(fixed.output, /};\n\n[ \t]*export const primary/);
	assert.match(fixed.output, /\$state<State>\(\);\n\n[ \t]*function received/);
	assert.match(fixed.output, /state = value;\n[ \t]*}\n\n[ \t]*async function refresh/);
	assert.match(fixed.output, /\n[ \t]*}\n\n[ \t]*const selected/);
	const [after] = await lint.lintText(fixed.output, { filePath });
	assert.deepEqual(
		after.messages.filter((m) => m.ruleId?.includes('padding')),
		[]
	);
});
