import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { POLL_TIMEOUT_FLOOR_MS } from '../vitest/poll-floor.mjs';
import { createVitestConfig as createNextConfig } from '../vitest/nextjs.mjs';
import { createVitestConfig as createNodeConfig } from '../vitest/node.mjs';

describe('expect.poll default timeout', () => {
	it('is the floor the lint rule enforces, so a bare expect.poll survives a loaded machine', () => {
		assert.equal(createNodeConfig().test.expect.poll.timeout, POLL_TIMEOUT_FLOOR_MS);
		assert.equal(
			createNextConfig({ rootDir: import.meta.dirname }).test.expect.poll.timeout,
			POLL_TIMEOUT_FLOOR_MS
		);
	});
});

describe('the poll floor for TypeScript', () => {
	it('types as a number in a strict TypeScript config that imports it', async () => {
		const ts = (await import('typescript')).default;
		const dir = await mkdtemp(path.join(tmpdir(), 'poll-floor-'));
		const file = path.join(dir, 'config.mts');
		const floor = path.resolve(import.meta.dirname, '../vitest/poll-floor.mjs');
		await writeFile(
			file,
			`import { POLL_TIMEOUT_FLOOR_MS } from ${JSON.stringify(floor)};\nexport const n: number = POLL_TIMEOUT_FLOOR_MS;\n`
		);
		const program = ts.createProgram([file], {
			strict: true,
			noEmit: true,
			module: ts.ModuleKind.NodeNext,
			moduleResolution: ts.ModuleResolutionKind.NodeNext,
			target: ts.ScriptTarget.ES2022
		});
		const problems = ts
			.getPreEmitDiagnostics(program)
			.map((problem) => ts.flattenDiagnosticMessageText(problem.messageText, '\n'));
		assert.deepEqual(problems, []);
	});
});
