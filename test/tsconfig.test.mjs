import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import ts from 'typescript';

const PRESETS_DIR = path.resolve(import.meta.dirname, '../tsconfig');
/** Every preset, so a new one cannot skip the check. */
const PRESETS = (await readdir(PRESETS_DIR)).map((file) => path.basename(file, '.json'));
/** @type {string[]} */
const scratch = [];
after(() => Promise.all(scratch.map((dir) => rm(dir, { recursive: true, force: true }))));

/** Code each preset must reject: line 2 under exactOptionalPropertyTypes, line 4 under noUncheckedIndexedAccess. */
const LOOSE_CODE = `interface Options { label?: string }
export const options: Options = { label: undefined };
const names: string[] = [];
export const first: string = names[0];
`;

/**
 * Type-checks LOOSE_CODE in a project whose tsconfig extends `preset`, and returns each error as
 * `line: TScode`.
 * @param {string} preset
 */
async function errorsUnder(preset) {
	const dir = await mkdtemp(path.join(tmpdir(), `tsconfig-${preset}-`));
	scratch.push(dir);
	const base = path.join(PRESETS_DIR, `${preset}.json`);
	// The Svelte and Next.js presets leave `module` to SvelteKit's or Next's own tsconfig.
	const compilerOptions = {
		noEmit: true,
		module: preset.startsWith('node') ? 'nodenext' : 'esnext',
		types: []
	};
	await writeFile(
		path.join(dir, 'tsconfig.json'),
		JSON.stringify({ extends: base, compilerOptions, include: ['code.ts'] })
	);
	// The Node presets use verbatimModuleSyntax, which wants an ES module package.
	await writeFile(path.join(dir, 'package.json'), '{ "type": "module" }');
	await writeFile(path.join(dir, 'code.ts'), LOOSE_CODE);
	const parsed = ts.getParsedCommandLineOfConfigFile(
		path.join(dir, 'tsconfig.json'),
		{},
		{
			...ts.sys,
			onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
				assert.fail(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
			}
		}
	);
	assert.ok(parsed, `${preset} did not parse`);
	assert.deepEqual(parsed.errors, [], `${preset}'s tsconfig has errors`);
	const program = ts.createProgram(parsed.fileNames, parsed.options);

	return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
		assert.ok(diagnostic.file && diagnostic.start !== undefined, diagnostic.messageText);
		const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

		return `${line + 1}: TS${diagnostic.code}`;
	});
}

describe('tsconfig presets', () => {
	for (const preset of PRESETS) {
		it(`${preset} rejects an explicit undefined in an optional property and an unchecked index`, async () => {
			assert.deepEqual(await errorsUnder(preset), ['2: TS2375', '4: TS2322']);
		});
	}
});
