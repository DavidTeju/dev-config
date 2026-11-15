import { POLL_TIMEOUT_FLOOR_MS } from '../../vitest/poll-floor.mjs';
import { CONDITION, FAKE_TIMERS, isMemberCall, staticNumber } from './clock.mjs';

/**
 * Reports `expect.poll` and `vi.waitFor` given less than the floor to see their condition, and a
 * `vi.waitFor` left at its 1 s default (Vitest has no config default for it, unlike
 * `expect.poll`, which the shared Vitest configs set to the floor). A longer timeout costs nothing
 * when the condition holds, since the poll returns as soon as it does; a short one fails the test
 * whenever the machine is busy.
 */

/**
 * The `timeout` property of an options object, or the options itself when it is a number.
 * @param {import('estree').Node | undefined} options
 * @param {boolean} numberAllowed
 */
function timeoutOf(options, numberAllowed) {
	if (options?.type !== 'ObjectExpression') return numberAllowed ? options : undefined;

	const property = options.properties.find(
		(entry) =>
			entry.type === 'Property' &&
			!entry.computed &&
			entry.key.type === 'Identifier' &&
			entry.key.name === 'timeout'
	);

	return property?.type === 'Property' ? property.value : undefined;
}

/** @type {import('eslint').Rule.RuleModule} */
export const pollTimeoutFloor = {
	meta: {
		type: 'problem',
		docs: {
			description: `Require expect.poll and vi.waitFor timeouts of at least ${POLL_TIMEOUT_FLOOR_MS} ms`
		},
		messages: {
			short: `A poll timeout under ${POLL_TIMEOUT_FLOOR_MS} ms fails whenever the machine is busy, and a longer one costs nothing when the condition holds. Give it at least ${POLL_TIMEOUT_FLOOR_MS} ms (expect.poll's default already is), or if the test measures time, use ${FAKE_TIMERS}.`,
			defaulted: `vi.waitFor waits only 1 s by default, which fails whenever the machine is busy. Pass { timeout: ${POLL_TIMEOUT_FLOOR_MS} } or more, or use expect.poll, whose default is ${POLL_TIMEOUT_FLOOR_MS} ms; either way ${CONDITION.replace('wait on', 'it waits on')}.`
		},
		fixable: 'code',
		schema: []
	},
	create(context) {
		return {
			CallExpression(node) {
				const isPoll = isMemberCall(node, 'expect', 'poll');
				const isWaitFor = isMemberCall(node, 'vi', 'waitFor');
				if (!isPoll && !isWaitFor) return;

				const timeout = timeoutOf(node.arguments[1], isWaitFor);
				if (!timeout) {
					const [callback, options] = node.arguments;
					if (isWaitFor) {
						context.report({
							node,
							messageId: 'defaulted',
							// Only a bare call is fixed; options without a timeout are left to a person.
							fix:
								callback && !options
									? (fixer) =>
											fixer.insertTextAfter(callback, `, { timeout: ${POLL_TIMEOUT_FLOOR_MS} }`)
									: null
						});
					}

					return;
				}

				const value = staticNumber(context, timeout);
				if (value !== undefined && value < POLL_TIMEOUT_FLOOR_MS) {
					context.report({ node, messageId: 'short' });
				}
			}
		};
	}
};
