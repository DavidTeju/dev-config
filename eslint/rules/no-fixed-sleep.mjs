import ts from 'typescript';
import {
	CONDITION,
	FAKE_TIMERS,
	calleeName,
	findVariable,
	isFunction,
	isZero,
	staticNumber
} from './clock.mjs';

/**
 * Reports a test that sleeps for a fixed time: `new Promise((r) => setTimeout(r, ms))`, a
 * `sleep`/`wait`/`pause`/`delay(ms)` helper, `setTimeout(ms)` from `node:timers/promises`,
 * `scheduler.wait(ms)` and Playwright's `waitForTimeout`. On a loaded machine the sleep is too
 * short and the test fails; on a quiet one it waits for nothing, and a test that sleeps to prove
 * something did not happen passes whether or not it would have. A zero or missing delay, which
 * yields one turn of the event loop, is allowed.
 */

const SLEEP_HELPERS = new Set(['sleep', 'wait', 'pause', 'delay']);

/**
 * Whether a helper's first argument is a duration: a number, or something that is neither a
 * function nor an object (so `wait(() => ready)` and `wait({ until })` are left alone).
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node | undefined} node
 */
function isDuration(context, node) {
	if (!node || node.type === 'SpreadElement' || isFunction(node) || isZero(node)) return false;
	if (node.type === 'ObjectExpression' || node.type === 'ArrayExpression') return false;
	if (node.type === 'Literal') return typeof node.value === 'number';

	const known = staticNumber(context, node);
	if (known !== undefined) return known !== 0;

	// With type information, a duration is whatever is typed as a number.
	const services = context.sourceCode.parserServices;
	if (services?.program && services.esTreeNodeToTSNodeMap) {
		const checker = services.program.getTypeChecker();
		const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node));

		return (type.flags & ts.TypeFlags.NumberLike) !== 0;
	}

	return true;
}

/**
 * Whether `setTimeout` here is the promise one from `node:timers/promises`, whose first argument
 * is the delay.
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').CallExpression} node
 */
function isPromiseSetTimeout(context, node) {
	if (node.callee.type !== 'Identifier') return false;

	const definition = findVariable(context.sourceCode.getScope(node), node.callee.name)?.defs[0];

	return (
		definition?.type === 'ImportBinding' &&
		/^(node:)?timers\/promises$/.test(String(definition.parent.source.value))
	);
}

/**
 * The first parameter of the executor of the `new Promise` this node sits in, if any.
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node} node
 */
function enclosingResolve(context, node) {
	for (const ancestor of context.sourceCode.getAncestors(node).reverse()) {
		if (!isFunction(ancestor)) continue;

		const { parent } = /** @type {{ parent?: import('estree').Node }} */ (ancestor);
		if (
			parent?.type === 'NewExpression' &&
			parent.callee.type === 'Identifier' &&
			parent.callee.name === 'Promise' &&
			parent.arguments[0] === ancestor
		) {
			const [first] = /** @type {import('estree').Function} */ (ancestor).params;

			return first?.type === 'Identifier' ? first.name : undefined;
		}
	}

	return undefined;
}

/**
 * Whether a timer callback just resolves the promise: `resolve` or `() => resolve()`. Resolving
 * with a value, as in `setTimeout(() => resolve('timed out'), ms)` raced against the real
 * outcome, is a watchdog rather than a sleep and is left alone.
 * @param {import('estree').Node | undefined} callback
 * @param {string} resolve
 */
function resolvesOnly(callback, resolve) {
	if (callback?.type === 'Identifier') return callback.name === resolve;
	if (callback?.type !== 'ArrowFunctionExpression') return false;

	const body =
		callback.body.type === 'BlockStatement' && callback.body.body.length === 1
			? callback.body.body[0]
			: callback.body;
	const call = body.type === 'ExpressionStatement' ? body.expression : body;

	return (
		call.type === 'CallExpression' &&
		call.callee.type === 'Identifier' &&
		call.callee.name === resolve &&
		call.arguments.length === 0
	);
}

/** @type {import('eslint').Rule.RuleModule} */
export const noFixedSleep = {
	meta: {
		type: 'problem',
		docs: { description: 'Disallow fixed sleeps in tests' },
		messages: {
			sleep: `A fixed sleep is too short under load and waits for nothing on a quiet machine. Use ${FAKE_TIMERS} for time the code measures, or ${CONDITION}.`
		},
		schema: []
	},
	create(context) {
		return {
			CallExpression(node) {
				const name = calleeName(node);
				const [first, second] = node.arguments;
				if (name === 'waitForTimeout') {
					context.report({ node, messageId: 'sleep' });

					return;
				}

				if (name === 'setTimeout') {
					if (isPromiseSetTimeout(context, node)) {
						if (isDuration(context, first)) context.report({ node, messageId: 'sleep' });

						return;
					}

					const resolve = enclosingResolve(context, node);
					if (resolve && second && !isZero(second) && resolvesOnly(first, resolve)) {
						context.report({ node, messageId: 'sleep' });
					}

					return;
				}

				const isHelper =
					node.callee.type === 'Identifier'
						? SLEEP_HELPERS.has(node.callee.name)
						: name === 'wait' &&
							node.callee.type === 'MemberExpression' &&
							node.callee.object.type === 'Identifier' &&
							node.callee.object.name === 'scheduler';
				if (isHelper && isDuration(context, first)) context.report({ node, messageId: 'sleep' });
			}
		};
	}
};
