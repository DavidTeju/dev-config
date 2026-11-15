import { FAKE_TIMERS, findVariable, isExpectArgument, isMemberCall } from './clock.mjs';

/**
 * Reports an assertion on measured wall time: `expect(Date.now() - started).toBeLessThan(n)`,
 * the same through a variable, or `Date.now() - started < n`. Wall time depends on how busy the
 * machine is, so the assertion fails under load and passes by luck. A timestamp in the past, such
 * as `Date.now() - HOUR_MS`, is not a measurement and is left alone: the subtrahend must itself be
 * a clock reading, or a variable initialised with one.
 */

const COMPARISONS = new Set(['<', '<=', '>', '>=']);

/** @param {import('estree').Node | null | undefined} node */
function isClockReading(node) {
	if (isMemberCall(node, 'Date', 'now') || isMemberCall(node, 'performance', 'now')) return true;

	// new Date().getTime()
	return (
		node?.type === 'CallExpression' &&
		node.callee.type === 'MemberExpression' &&
		node.callee.property.type === 'Identifier' &&
		node.callee.property.name === 'getTime' &&
		node.callee.object.type === 'NewExpression' &&
		node.callee.object.callee.type === 'Identifier' &&
		node.callee.object.callee.name === 'Date' &&
		node.callee.object.arguments.length === 0
	);
}

/**
 * Whether an expression is a clock reading, or a variable initialised with one.
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node} node
 */
function isReadingOrMark(context, node) {
	if (isClockReading(node)) return true;
	if (node.type !== 'Identifier') return false;

	const definition = findVariable(context.sourceCode.getScope(node), node.name)?.defs[0];

	return definition?.type === 'Variable' && isClockReading(definition.node.init);
}

/**
 * Whether an expression measures elapsed time: a clock reading minus a clock reading or mark.
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node} node
 */
function isElapsed(context, node) {
	return (
		node.type === 'BinaryExpression' &&
		node.operator === '-' &&
		isClockReading(node.left) &&
		isReadingOrMark(context, node.right)
	);
}

/**
 * Where a measured duration is asserted on: as expect()'s argument or a comparison operand.
 * @param {import('estree').Node & { parent?: import('estree').Node }} node
 */
function isAsserted(node) {
	if (isExpectArgument(node)) return true;

	return node.parent?.type === 'BinaryExpression' && COMPARISONS.has(node.parent.operator);
}

/** @type {import('eslint').Rule.RuleModule} */
export const noElapsedTimeAssertion = {
	meta: {
		type: 'problem',
		docs: { description: 'Disallow assertions on measured wall time in tests' },
		messages: {
			elapsed: `Wall time depends on how busy the machine is, so this fails under load and passes by luck. Use ${FAKE_TIMERS} and assert what happened by a given fake time, or assert the outcome the time limit causes (the condition, not the clock).`
		},
		schema: []
	},
	create(context) {
		return {
			BinaryExpression(node) {
				if (!isElapsed(context, node)) return;
				if (isAsserted(node)) {
					context.report({ node, messageId: 'elapsed' });

					return;
				}

				// const took = Date.now() - started; expect(took)...
				const { parent } = /** @type {{ parent?: import('estree').Node }} */ (node);
				if (parent?.type !== 'VariableDeclarator' || parent.init !== node) return;

				for (const variable of context.sourceCode.getDeclaredVariables(parent)) {
					for (const reference of variable.references) {
						if (reference.isRead() && isAsserted(reference.identifier)) {
							context.report({ node: reference.identifier, messageId: 'elapsed' });
						}
					}
				}
			}
		};
	}
};
