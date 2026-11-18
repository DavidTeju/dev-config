import assert from 'node:assert/strict';
import path from 'node:path';
import { before, describe, it } from 'node:test';
import { ESLint } from 'eslint';
import { createConfig } from '../eslint/config.mjs';

const project = path.join(import.meta.dirname, 'fixtures/project');
const CLOCK_RULES = new Set([
	'@davidteju/no-fixed-sleep',
	'@davidteju/poll-timeout-floor',
	'@davidteju/no-elapsed-time-assertion',
	'@davidteju/no-exact-timer-count'
]);
const RULES = new Set([
	'@typescript-eslint/consistent-type-assertions',
	'@typescript-eslint/no-floating-promises',
	'@davidteju/no-throw',
	'@davidteju/must-use-result',
	'@davidteju/no-ignored-error',
	'sonarjs/void-use',
	'@stylistic/padding-line-between-statements',
	'@davidteju/no-fixed-sleep',
	'@davidteju/poll-timeout-floor',
	'@davidteju/no-elapsed-time-assertion',
	'@davidteju/no-exact-timer-count'
]);

/**
 * Lints the fixture project and returns, per file name, the messages from the rules under test.
 * @param {import('eslint').Linter.Config[]} config
 */
async function lintFixtures(config) {
	const eslint = new ESLint({ cwd: project, overrideConfigFile: true, overrideConfig: config });
	/** @type {Map<string, { rule: string | null, line: number }[]>} */
	const found = new Map();
	for (const result of await eslint.lintFiles(['src/**/*.ts', 'e2e/**/*.ts'])) {
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
			{ rule: '@typescript-eslint/consistent-type-assertions', line: 5 }
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

	it('lets a test helper under test/ throw and cast, but not drop a Result', () => {
		assert.deepEqual(reported('fake-store.ts'), [{ rule: '@davidteju/must-use-result', line: 9 }]);
	});

	it('lets an e2e helper throw and cast', () => {
		assert.deepEqual(reported('sign-in.ts'), []);
	});

	it('keeps the bans in product code under a folder that happens to be named test', () => {
		assert.deepEqual(reported('page.ts'), [
			{ rule: '@davidteju/no-throw', line: 3 },
			{ rule: '@typescript-eslint/consistent-type-assertions', line: 5 }
		]);
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

describe('no-ignored-error', () => {
	it('reports every handler that drops its error, and unwrapOr without orTee first', () => {
		assert.deepEqual(
			reported('ignored-errors.ts').map(({ line }) => line),
			[10, 11, 12, 13, 14, 17, 19, 20, 21, 24]
		);
	});

	it('reports nothing where the error is used, reported or re-raised', () => {
		assert.ok(reported('ignored-errors.ts').every(({ line }) => line < 30));
	});

	it('catches the forms a review found it missed: bare fromPromise, a computed catch, a write-only error', () => {
		assert.deepEqual(
			reported('ignored-errors-review.ts')
				.filter(({ line }) => line < 22)
				.map(({ line }) => line),
			[11, 12, 13, 16]
		);
	});

	it('leaves zod-style catch, rest and default params, this, wrapped orTee and an Ok alone', () => {
		assert.deepEqual(
			reported('ignored-errors-review.ts').filter(({ line }) => line >= 22),
			[]
		);
	});

	it('still catches catch, .catch, .then and neverthrow error mappers without type information', async () => {
		const untyped = await lintFixtures(await createConfig({ typeChecked: false }));
		assert.deepEqual(
			untyped('ignored-errors.ts').map(({ line }) => line),
			[12, 13, 20, 21, 24]
		);
	});
});

describe('statement spacing', () => {
	it('wants a blank line after each if and before a return', () => {
		assert.deepEqual(reported('spacing.ts'), [
			{ rule: '@stylistic/padding-line-between-statements', line: 3 },
			{ rule: '@stylistic/padding-line-between-statements', line: 5 },
			{ rule: '@stylistic/padding-line-between-statements', line: 6 }
		]);
	});
});

describe('clock-based tests', () => {
	const at = (rule, lines) => lines.map((line) => ({ rule, line }));

	it('reports a fixed sleep in a test, in each form it takes', () => {
		assert.deepEqual(
			reported('sleeps.test.ts'),
			at('@davidteju/no-fixed-sleep', [11, 12, 14, 16, 17, 18, 19])
		);
	});

	it('reports setTimeout(ms) from node:timers/promises', () => {
		assert.deepEqual(reported('timers-promises.test.ts'), at('@davidteju/no-fixed-sleep', [5, 6]));
	});

	it('leaves product code alone: only tests must wait on conditions', () => {
		assert.deepEqual(reported('sleeps.ts'), []);
	});

	it('reports a poll timeout below the floor, and vi.waitFor left at its 1 s default', () => {
		assert.deepEqual(
			reported('polls.test.ts'),
			at('@davidteju/poll-timeout-floor', [10, 11, 12, 13, 14])
		);
	});

	it('reports an assertion on measured wall time, not a timestamp in the past', () => {
		assert.deepEqual(
			reported('elapsed.test.ts'),
			at('@davidteju/no-elapsed-time-assertion', [7, 10, 11])
		);
	});

	it('reports an exact count of fake timers other than none', () => {
		assert.deepEqual(
			reported('timer-count.test.ts'),
			at('@davidteju/no-exact-timer-count', [5, 6])
		);
	});

	it('names the fix in every message', async () => {
		const eslint = new ESLint({
			cwd: project,
			overrideConfigFile: true,
			overrideConfig: await createConfig()
		});
		const results = await eslint.lintFiles(['src/*.test.ts']);
		const messages = results
			.flatMap((result) => result.messages)
			.filter((message) => CLOCK_RULES.has(message.ruleId ?? ''));
		assert.ok(messages.length > 0);
		for (const message of messages) {
			assert.match(message.message, /vi\.useFakeTimers|condition/, message.message);
		}
	});
});

describe('poll-timeout-floor autofix', () => {
	it('gives a bare vi.waitFor the floor as its timeout, and leaves short explicit ones to a person', async () => {
		const eslint = new ESLint({
			cwd: project,
			overrideConfigFile: true,
			overrideConfig: await createConfig(),
			fix: true
		});
		const [result] = await eslint.lintFiles(['src/polls.test.ts']);
		const fixed = result.output ?? '';
		assert.match(fixed, /await vi\.waitFor\(\(\) => 1, \{ timeout: 5000 \}\);/);
		assert.match(fixed, /await vi\.waitFor\(\(\) => 1, 200\);/);
		assert.match(fixed, /expect\.poll\(\(\) => 1, \{ timeout: 500 \}\);/);
	});
});

describe('clock rules, from the review of their first version', () => {
	const at = (rule, lines) => lines.map((line) => ({ rule, line }));

	it('catches the sleep forms first missed, and not an unawaited delay() or a helper under test', () => {
		assert.deepEqual(
			reported('review-sleeps.test.ts'),
			at('@davidteju/no-fixed-sleep', [11, 13, 17, 18, 19, 20, 21])
		);
	});

	it('does not crash on import-equals', () => {
		assert.deepEqual(reported('import-equals.test.ts'), []);
	});

	it('reports a measured delta only where it is asserted against a bound', () => {
		assert.deepEqual(
			reported('review-elapsed.test.ts'),
			at('@davidteju/no-elapsed-time-assertion', [15, 17, 18])
		);
	});

	it('covers vi.waitUntil and quoted keys, and leaves spread options and baselines alone', () => {
		assert.deepEqual(
			reported('review-polls.test.ts'),
			at('@davidteju/poll-timeout-floor', [11, 13, 15])
		);
	});

	it('fixes a parenthesised callback after its parentheses', async () => {
		const eslint = new ESLint({
			cwd: project,
			overrideConfigFile: true,
			overrideConfig: await createConfig(),
			fix: true
		});
		const [result] = await eslint.lintFiles(['src/review-polls.test.ts']);
		assert.match(result.output ?? '', /await vi\.waitFor\(\(\(\) => 1\), \{ timeout: 5000 \}\);/);
		assert.match(result.output ?? '', /await vi\.waitUntil\(\(\) => 1, \{ timeout: 5000 \}\);/);
	});
});

describe('clock rules without type information', () => {
	it('report only literal and const durations, never a guess', async () => {
		const untyped = await lintFixtures(await createConfig({ typeChecked: false }));
		// Line 17 sleeps for a typed `ms`; without types it is left alone.
		assert.deepEqual(
			untyped('review-sleeps.test.ts').filter(({ rule }) => rule === '@davidteju/no-fixed-sleep'),
			[11, 13, 18, 19, 20, 21].map((line) => ({ rule: '@davidteju/no-fixed-sleep', line }))
		);
	});
});
