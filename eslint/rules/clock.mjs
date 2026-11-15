/** Shared helpers for the rules that keep tests off the wall clock. */

/** How each message names the fix. */
export const FAKE_TIMERS =
	'fake timers (vi.useFakeTimers(), then await vi.advanceTimersByTimeAsync(ms))';
export const CONDITION =
	'wait on the condition the test asserts (expect.poll, vi.waitFor, or a Playwright locator assertion)';

/** @param {import('estree').Node | null | undefined} node */
export function isZero(node) {
	return node?.type === 'Literal' && node.value === 0;
}

/**
 * The callee's name: `foo` for `foo()`, `bar` for `a.bar()`.
 * @param {import('estree').CallExpression} node
 */
export function calleeName(node) {
	const { callee } = node;
	if (callee.type === 'Identifier') return callee.name;
	if (
		callee.type === 'MemberExpression' &&
		!callee.computed &&
		callee.property.type === 'Identifier'
	) {
		return callee.property.name;
	}

	return undefined;
}

/**
 * Whether `node` is `object.property(...)`.
 * @param {import('estree').Node | null | undefined} node
 * @param {string} object
 * @param {string} property
 */
export function isMemberCall(node, object, property) {
	return (
		node?.type === 'CallExpression' &&
		node.callee.type === 'MemberExpression' &&
		!node.callee.computed &&
		node.callee.object.type === 'Identifier' &&
		node.callee.object.name === object &&
		node.callee.property.type === 'Identifier' &&
		node.callee.property.name === property
	);
}

/**
 * The argument of the `expect(...)` call this node is passed to, if it is.
 * @param {import('estree').Node & { parent?: import('estree').Node }} node
 */
export function isExpectArgument(node) {
	const { parent } = node;

	return (
		parent?.type === 'CallExpression' &&
		parent.arguments[0] === node &&
		parent.callee.type === 'Identifier' &&
		parent.callee.name === 'expect'
	);
}

/** @param {import('estree').Node | null | undefined} node */
export function isFunction(node) {
	return node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression';
}

/**
 * A numeric literal's value, or the value of a `const` initialised with one in the same file.
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node} node
 * @returns {number | undefined}
 */
export function staticNumber(context, node) {
	if (node.type === 'Literal' && typeof node.value === 'number') return node.value;
	if (node.type !== 'Identifier') return undefined;

	const variable = findVariable(context.sourceCode.getScope(node), node.name);
	const definition = variable?.defs[0];
	if (
		definition?.type === 'Variable' &&
		definition.parent.kind === 'const' &&
		definition.node.init?.type === 'Literal' &&
		typeof definition.node.init.value === 'number'
	) {
		return definition.node.init.value;
	}

	return undefined;
}

/**
 * @param {import('eslint').Scope.Scope | null} scope
 * @param {string} name
 */
export function findVariable(scope, name) {
	for (let current = scope; current; current = current.upper) {
		const variable = current.set.get(name);
		if (variable) return variable;
	}

	return undefined;
}
