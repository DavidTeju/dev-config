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
 * Reports a test that sleeps for a fixed time: `new Promise((r) => setTimeout(r, ms))`, an
 * awaited `sleep`/`wait`/`pause`/`delay(ms)` helper (`utils.sleep(ms)` too), `setTimeout(ms)`
 * from `node:timers/promises` however it is imported, `scheduler.wait(ms)` and Playwright's
 * `waitForTimeout`. On a loaded machine the sleep is too short and the test fails; on a quiet one
 * it waits for nothing, and a test that sleeps to prove something did not happen passes whether
 * or not it would have. Allowed: a zero or missing delay, which yields one turn of the event loop;
 * a watchdog that resolves with a value; a helper call that is not awaited (an RxJS or msw
 * `delay` operator, or a helper under test run on fake timers).
 */

const SLEEP_HELPERS = new Set(['sleep', 'wait', 'pause', 'delay']);
const TIMERS_PROMISES = /^(node:)?timers\/promises$/;

/** @param {import('typescript').Type} type */
const isNumberType = (type) =>
	type.isUnion()
		? type.types.some((part) => (part.flags & ts.TypeFlags.NumberLike) !== 0)
		: (type.flags & ts.TypeFlags.NumberLike) !== 0;

/**
 * Whether a call's first argument is a duration: a non-zero number, a `const` holding one, or,
 * with type information, anything typed as a number. Without types, nothing else counts.
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node | undefined} node
 */
function isDuration(context, node) {
	if (!node || node.type === 'SpreadElement' || isFunction(node) || isZero(node)) return false;

	const known = staticNumber(context, node);
	if (known !== undefined) return known !== 0;
	if (node.type === 'Literal') return false;

	const services = context.sourceCode.parserServices;
	if (!services?.program || !services.esTreeNodeToTSNodeMap) return false;

	const checker = services.program.getTypeChecker();

	return isNumberType(checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node)));
}

/**
 * How `name` is imported from `node:timers/promises` here: `'setTimeout'` for that function
 * under any local name, `'module'` for a namespace or default import, else `undefined`.
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node} node
 * @param {string} name
 */
function timersImport(context, node, name) {
	const definition = findVariable(context.sourceCode.getScope(node), name)?.defs[0];
	// Only an ES import has a source; `import x = require(...)` is left alone.
	if (definition?.type !== 'ImportBinding' || definition.parent?.type !== 'ImportDeclaration') {
		return undefined;
	}

	if (!TIMERS_PROMISES.test(String(definition.parent.source.value))) return undefined;

	const specifier = definition.node;
	if (specifier.type !== 'ImportSpecifier') return 'module';

	const imported =
		specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;

	return imported === 'setTimeout' ? 'setTimeout' : undefined;
}

/**
 * Whether this call is `setTimeout(ms)` from `node:timers/promises`: imported by name (under any
 * local name), or called on the module (`timers.setTimeout(ms)`).
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').CallExpression} node
 */
function isPromiseSetTimeout(context, node) {
	const { callee } = node;
	if (callee.type === 'Identifier') {
		return timersImport(context, node, callee.name) === 'setTimeout';
	}

	return (
		callee.type === 'MemberExpression' &&
		callee.object.type === 'Identifier' &&
		calleeName(node) === 'setTimeout' &&
		timersImport(context, node, callee.object.name) === 'module'
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

/** @param {import('estree').Node | undefined} node */
const isNoValue = (node) =>
	node === undefined ||
	(node.type === 'Identifier' && node.name === 'undefined') ||
	(node.type === 'UnaryExpression' && node.operator === 'void');

/**
 * Whether a timer callback just resolves the promise: `resolve`, `() => resolve()`, or the same as
 * a function expression, with no value or `undefined`. Resolving with a value, as in
 * `setTimeout(() => resolve('timed out'), ms)` raced against the real outcome, is a watchdog
 * rather than a sleep.
 * @param {import('estree').Node | undefined} callback
 * @param {string} resolve
 */
function resolvesOnly(callback, resolve) {
	if (callback?.type === 'Identifier') return callback.name === resolve;
	if (callback?.type !== 'ArrowFunctionExpression' && callback?.type !== 'FunctionExpression') {
		return false;
	}

	const body =
		callback.body.type === 'BlockStatement' && callback.body.body.length === 1
			? callback.body.body[0]
			: callback.body;
	const call = body.type === 'ExpressionStatement' ? body.expression : body;

	return (
		call.type === 'CallExpression' &&
		call.callee.type === 'Identifier' &&
		call.callee.name === resolve &&
		call.arguments.length <= 1 &&
		isNoValue(call.arguments[0])
	);
}

/**
 * Whether the test waits on this call: awaited, or returned (as a concise arrow body too).
 * @param {import('estree').Node & { parent?: import('estree').Node }} node
 */
function isWaitedOn(node) {
	const { parent } = node;

	return (
		parent?.type === 'AwaitExpression' ||
		parent?.type === 'ReturnStatement' ||
		(parent?.type === 'ArrowFunctionExpression' && parent.body === node)
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

				if (isPromiseSetTimeout(context, node)) {
					if (isDuration(context, first)) context.report({ node, messageId: 'sleep' });

					return;
				}

				if (node.callee.type === 'Identifier' && name === 'setTimeout') {
					const resolve = enclosingResolve(context, node);
					if (resolve && second && !isZero(second) && resolvesOnly(first, resolve)) {
						context.report({ node, messageId: 'sleep' });
					}

					return;
				}

				const helper = name !== undefined && SLEEP_HELPERS.has(name);
				if (helper && isWaitedOn(node) && isDuration(context, first)) {
					context.report({ node, messageId: 'sleep' });
				}
			}
		};
	}
};
