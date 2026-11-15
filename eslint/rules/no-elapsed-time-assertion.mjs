import { FAKE_TIMERS, findVariable, isExpectArgument, isMemberCall } from './clock.mjs';

/**
 * Reports an assertion on measured wall time: `expect(Date.now() - started).toBeLessThan(n)`,
 * the same through a variable, or `Date.now() - started < n`. Wall time depends on how busy the
 * machine is, so the assertion fails under load and passes by luck. A timestamp in the past, such
 * as `Date.now() - HOUR_MS`, is not a measurement and is left alone: the subtrahend must itself be
 * a clock reading, or a variable initialised with one.
 */

const COMPARISONS = new Set(['<', '<=', '>', '>=']);
const ARITHMETIC = new Set(['+', '-', '*', '/']);
/** Matchers that bound a value; an exact match on a delta only makes sense on a fake clock. */
const BOUNDS = new Set([
	'toBeLessThan',
	'toBeLessThanOrEqual',
	'toBeGreaterThan',
	'toBeGreaterThanOrEqual'
]);
const ASSERTS = new Set(['assert', 'ok', 'expect', 'strictEqual', 'equal']);

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
 * Whether an expression is a clock reading, or a variable given one, where it is declared or in
 * any later assignment (`started = Date.now()` in a beforeEach).
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node} node
 */
function isReadingOrMark(context, node) {
	if (isClockReading(node)) return true;
	if (node.type !== 'Identifier') return false;

	const variable = findVariable(context.sourceCode.getScope(node), node.name);
	if (!variable) return false;

	const [definition] = variable.defs;
	if (definition?.type === 'Variable' && isClockReading(definition.node.init)) return true;

	return variable.references.some((reference) => isClockReading(reference.writeExpr));
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
 * The outermost expression a measured value is part of: `(now - start) / 1000` for its delta.
 * @param {import('estree').Node & { parent?: import('estree').Node }} node
 */
function widened(node) {
	let current = node;
	while (current.parent?.type === 'BinaryExpression' && ARITHMETIC.has(current.parent.operator)) {
		current = current.parent;
	}

	return current;
}

/**
 * Whether a call is an assertion: `assert(...)`, `assert.ok(...)`, `expect(...)` and the like.
 * @param {import('estree').Node | undefined} node
 */
function isAssertCall(node) {
	if (node?.type !== 'CallExpression') return false;

	const { callee } = node;
	if (callee.type === 'Identifier') return ASSERTS.has(callee.name);

	return (
		callee.type === 'MemberExpression' &&
		callee.object.type === 'Identifier' &&
		callee.object.name === 'assert'
	);
}

/**
 * Whether `expect(node)` goes on to a bound matcher: `.toBeLessThan(n)`, `.not.toBeGreaterThan(n)`.
 * @param {import('estree').Node & { parent?: import('estree').Node }} node
 */
function isBoundedByExpect(node) {
	if (!isExpectArgument(node)) return false;

	let member = /** @type {{ parent?: import('estree').Node }} */ (node.parent).parent;
	if (
		member?.type === 'MemberExpression' &&
		member.property.type === 'Identifier' &&
		member.property.name === 'not'
	) {
		member = /** @type {{ parent?: import('estree').Node }} */ (member).parent;
	}

	return (
		member?.type === 'MemberExpression' &&
		member.property.type === 'Identifier' &&
		BOUNDS.has(member.property.name)
	);
}

/**
 * Where a measured duration is asserted against a bound: as expect()'s argument with a bound
 * matcher, or compared inside an assertion (`assert.ok(now - start < n)`). A comparison in an
 * `if` or a deadline loop is not an assertion.
 * @param {import('estree').Node & { parent?: import('estree').Node }} node
 */
function isAsserted(node) {
	const value = widened(node);
	if (isBoundedByExpect(value)) return true;

	const { parent } = /** @type {{ parent?: import('estree').Node }} */ (value);
	if (parent?.type !== 'BinaryExpression' || !COMPARISONS.has(parent.operator)) return false;

	const comparison = widened(parent);

	return isAssertCall(/** @type {{ parent?: import('estree').Node }} */ (comparison).parent);
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
