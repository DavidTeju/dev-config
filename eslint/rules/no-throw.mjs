/**
 * Bans `throw`. A failure the caller can act on returns a neverthrow Result; a bug calls
 * `panic()`, which lives in the one file this rule is turned off for (`panic.ts`). A rule of its
 * own, rather than a `no-restricted-syntax` selector, so a project that sets its own selector list
 * does not silently drop the ban.
 */

/** @type {import('eslint').Rule.RuleModule} */
export const noThrow = {
	meta: {
		type: 'problem',
		docs: { description: 'Disallow throw; return a Result or call panic()' },
		messages: {
			thrown:
				'Do not throw. Return a neverthrow Result for a failure the caller can act on; call panic() from panic.ts for a bug.'
		},
		schema: []
	},
	create(context) {
		return {
			ThrowStatement(node) {
				context.report({ node, messageId: 'thrown' });
			}
		};
	}
};
