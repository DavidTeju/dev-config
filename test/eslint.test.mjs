import assert from 'node:assert/strict';
import path from 'node:path';
import { before, describe, it } from 'node:test';
import { ESLint } from 'eslint';
import { createConfig } from '../eslint/config.mjs';

const project = path.join(import.meta.dirname, 'fixtures/project');
const RULES = new Set([
	'@typescript-eslint/consistent-type-assertions',
	'@typescript-eslint/no-floating-promises',
	'@davidteju/no-throw',
	'@davidteju/must-use-result'
]);

/**
 * Lints the fixture project and returns, per file name, the messages from the rules under test.
 * @param {import('eslint').Linter.Config[]} config
 */
async function lintFixtures(config) {
	const eslint = new ESLint({ cwd: project, overrideConfigFile: true, overrideConfig: config });
	/** @type {Map<string, { rule: string | null, line: number }[]>} */
	const found = new Map();
	for (const result of await eslint.lintFiles(['src/**/*.ts'])) {
		const fatal = result.messages.filter((message) => message.fatal);
		assert.deepEqual(fatal, [], `ESLint could not parse ${result.filePath}`);
		found.set(
			path.basename(result.filePath),
			result.messages
				.filter((message) => RULES.has(message.ruleId ?? ''))
				.map((message) => ({ rule: message.ruleId, line: message.line }))
		);
	}
	return (file) => {
		const messages = found.get(file);
		assert.ok(messages, `${file} was not linted`);
		return messages;
	};
}

let reported;
before(async () => {
	reported = await lintFixtures(await createConfig());
});

describe('type assertions', () => {
	it('bans `as T` but allows `as const`', () => {
		assert.deepEqual(reported('cast.ts'), [
			{ rule: '@typescript-eslint/consistent-type-assertions', line: 4 }
		]);
	});

	it('allows casts in a file named unchecked.ts', () => {
		assert.deepEqual(reported('unchecked.ts'), []);
	});
});

describe('throw', () => {
	it('bans throw statements by default', () => {
		assert.deepEqual(reported('throws.ts'), [{ rule: '@davidteju/no-throw', line: 2 }]);
	});

	it('allows throw in a file named panic.ts', () => {
		assert.deepEqual(reported('panic.ts'), []);
	});

	it('allows throw in tests', () => {
		assert.deepEqual(reported('throws.test.ts'), []);
	});

	it("survives a project's own no-restricted-syntax list", async () => {
		const ownSelectors = {
			rules: {
				'no-restricted-syntax': ['error', { selector: 'NewExpression[callee.name="Date"]' }]
			}
		};
		const withOwn = await lintFixtures([...(await createConfig()), ownSelectors]);
		assert.deepEqual(withOwn('throws.ts'), [{ rule: '@davidteju/no-throw', line: 2 }]);
	});

	it('is off without type information, where dropped Results could not be caught', async () => {
		const untyped = await lintFixtures(await createConfig({ typeChecked: false }));
		assert.deepEqual(untyped('throws.ts'), []);
	});
});

describe('must-use-result', () => {
	it('reports a Result that is computed and dropped, awaited or not', () => {
		assert.deepEqual(reported('results.ts'), [
			{ rule: '@davidteju/must-use-result', line: 7 },
			{ rule: '@davidteju/must-use-result', line: 8 }
		]);
	});
});
