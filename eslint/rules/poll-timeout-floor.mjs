import { POLL_TIMEOUT_FLOOR_MS } from '../../vitest/poll-floor.mjs';
import { CONDITION, FAKE_TIMERS, isMemberCall, staticNumber } from './clock.mjs';

/**
 * Reports `expect.poll`, `vi.waitFor` and `vi.waitUntil` given less than the floor to see their
 * condition, and a `vi.waitFor` or `vi.waitUntil` left at its 1 s default: Vitest has no config
 * default for those, unlike `expect.poll`, whose default the shared Vitest configs set to the floor
 * (a project with its own Vitest config sets `test.expect.poll.timeout` itself). A longer timeout
 * costs nothing when the condition holds, since the poll returns as soon as it does; a short one
 * fails the test whenever the machine is busy.
 */

/** @param {import('estree').Property['key']} key */
const isTimeoutKey = (key) =>
	(key.type === 'Identifier' && key.name === 'timeout') ||
	(key.type === 'Literal' && key.value === 'timeout');

/**
 * The call's timeout: the options' `timeout` property, or the options itself when it is a number
 * (`vi.waitFor` takes either). `'unknown'` when spread options may hold one.
 * @param {import('estree').Node | undefined} options
 * @param {boolean} numberAllowed
 * @returns {import('estree').Node | 'unknown' | undefined}
 */
function timeoutOf(options, numberAllowed) {
	if (options?.type === 'SpreadElement') return 'unknown';
	if (options?.type !== 'ObjectExpression') return numberAllowed ? options : undefined;

	const property = options.properties.find(
		(entry) => entry.type === 'Property' && !entry.computed && isTimeoutKey(entry.key)
	);
	if (property?.type === 'Property') return property.value;

	return options.properties.some((entry) => entry.type === 'SpreadElement') ? 'unknown' : undefined;
}

/** @type {import('eslint').Rule.RuleModule} */
export const pollTimeoutFloor = {
	meta: {
		type: 'problem',
		docs: {
			description: `Require expect.poll and vi.waitFor timeouts of at least ${POLL_TIMEOUT_FLOOR_MS} ms`
		},
		messages: {
			short: `A poll timeout under ${POLL_TIMEOUT_FLOOR_MS} ms fails whenever the machine is busy, and a longer one costs nothing when the condition holds. Give it at least ${POLL_TIMEOUT_FLOOR_MS} ms (dev-config's Vitest configs make it expect.poll's default), or if the test measures time, use ${FAKE_TIMERS}.`,
			defaulted: `vi.waitFor and vi.waitUntil wait only 1 s by default, which fails whenever the machine is busy. Pass { timeout: ${POLL_TIMEOUT_FLOOR_MS} } or more, or use expect.poll, whose default is ${POLL_TIMEOUT_FLOOR_MS} ms; either way ${CONDITION.replace('wait on', 'it waits on')}.`
		},
		fixable: 'code',
		schema: []
	},
	create(context) {
		return {
			CallExpression(node) {
				const isPoll = isMemberCall(node, 'expect', 'poll');
				const isWaitFor =
					isMemberCall(node, 'vi', 'waitFor') || isMemberCall(node, 'vi', 'waitUntil');
				if (!isPoll && !isWaitFor) return;

				const [callback, options] = node.arguments;
				// `vi.waitFor(...args)`: what it passes is not known here.
				if (callback?.type === 'SpreadElement') return;

				const timeout = timeoutOf(options, isWaitFor);
				if (timeout === 'unknown') return;
				if (!timeout) {
					if (!isWaitFor) return;

					const close = context.sourceCode.getLastToken(node);
					const before = close && context.sourceCode.getTokenBefore(close);
					context.report({
						node,
						messageId: 'defaulted',
						// Only a bare call is fixed, after its last argument and any trailing comma; options
						// without a timeout are left to a person.
						fix:
							callback && !options && close?.value === ')'
								? (fixer) =>
										fixer.insertTextBefore(
											close,
											`${before?.value === ',' ? '' : ','} { timeout: ${POLL_TIMEOUT_FLOOR_MS} }`
										)
								: null
					});

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
