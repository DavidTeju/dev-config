import { FAKE_TIMERS, isExpectArgument, isMemberCall, isZero } from './clock.mjs';

/**
 * Reports `expect(vi.getTimerCount()).toBe(n)` for any n but 0. The count includes every fake
 * timer, ones a library or an unrelated retry sets among them, so an exact count breaks on
 * changes that do not touch what the test guards. `toBe(0)`, nothing left pending, is a property
 * of the code rather than a count of its timers, and is allowed.
 */

const EXACT = new Set(['toBe', 'toEqual', 'toStrictEqual']);

/** @type {import('eslint').Rule.RuleModule} */
export const noExactTimerCount = {
	meta: {
		type: 'problem',
		docs: { description: 'Disallow asserting an exact number of fake timers' },
		messages: {
			count: `An exact timer count breaks whenever any other timer is added. Advance ${FAKE_TIMERS.replace('fake timers ', '')} and assert the effect the timer has, or that it no longer fires: the condition, not the count.`
		},
		schema: []
	},
	create(context) {
		return {
			CallExpression(node) {
				if (!isMemberCall(node, 'vi', 'getTimerCount') || !isExpectArgument(node)) return;

				// expect(vi.getTimerCount()).toBe(n)
				const expectCall = /** @type {{ parent?: import('estree').Node }} */ (node).parent;
				const matcher = /** @type {{ parent?: import('estree').Node }} */ (expectCall)?.parent;
				if (matcher?.type !== 'MemberExpression' || matcher.property.type !== 'Identifier') return;

				const call = /** @type {{ parent?: import('estree').Node }} */ (matcher).parent;
				if (
					EXACT.has(matcher.property.name) &&
					call?.type === 'CallExpression' &&
					call.callee === matcher &&
					!isZero(call.arguments[0])
				) {
					context.report({ node: call, messageId: 'count' });
				}
			}
		};
	}
};
