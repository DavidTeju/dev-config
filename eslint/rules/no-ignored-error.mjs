import { typeMatchesSpecifier } from '@typescript-eslint/type-utils';

/**
 * Reports an error that is caught and then dropped: a handler that never reads the error it is
 * given, and neverthrow's `unwrapOr`, which has no handler to read it. Each turns a failure into
 * something that looks like an ordinary answer, so nobody can tell later that anything went wrong.
 *
 * - `catch {}`, and `.catch(() => …)` / `.then(…, () => …)` handlers; with type information, only
 *   on a thenable, so zod's `.catch(fallback)` is left alone.
 * - The error mapper of neverthrow's `fromPromise`, `fromThrowable` and `fromAsyncThrowable`,
 *   called bare or on `Result`/`ResultAsync`, as imported from neverthrow.
 * - With type information, on a neverthrow Result: `.orElse`, `.mapErr`, `.orTee` and `.match`'s
 *   error arm, and `.unwrapOr` unless `.orTee(handler)` comes before it (through `await`, `!`,
 *   casts and `.map`), which is how a fallback reports the error it replaces:
 *   `result.orTee(report).unwrapOr(fallback)`. A Result whose error type is `never` has none to drop.
 *
 * A handler reads its error when it reads the first parameter (named, not `_`-prefixed; a rest or
 * defaulted parameter counts), destructures it, or reads `arguments`. One passed by name
 * (`.catch(report)`) is assumed to read it.
 */

const RESULT_TYPES = /** @type {const} */ ({
	from: 'package',
	package: 'neverthrow',
	name: ['Ok', 'Err', 'ResultAsync']
});
/** Methods of a Result whose first argument receives the error. */
const ERROR_FIRST = new Set(['orElse', 'mapErr', 'orTee']);
/** neverthrow's constructors whose second argument maps a thrown value or rejection. */
const MAPS_THROWN = new Set(['fromPromise', 'fromThrowable', 'fromAsyncThrowable']);
/** Methods that may sit between `orTee` and `unwrapOr`: none of them adds an error. */
const KEEPS_ERRORS = new Set(['map', 'andTee', 'orTee']);
/** Wrappers that do not change which Result an expression is. */
const TRANSPARENT = new Set([
	'AwaitExpression',
	'TSNonNullExpression',
	'TSAsExpression',
	'TSSatisfiesExpression',
	'ChainExpression'
]);

/** @param {import('estree').Node | undefined} node */
const isFunction = (node) =>
	node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression';

/**
 * The name a member call uses: `a.b(…)` or `a['b'](…)`; `undefined` for any other callee.
 * @param {import('estree').Node} callee
 */
function memberName(callee) {
	if (callee.type !== 'MemberExpression') return undefined;
	const { property } = callee;
	if (!callee.computed && property.type === 'Identifier') return property.name;
	if (callee.computed && property.type === 'Literal' && typeof property.value === 'string') {
		return property.value;
	}

	return undefined;
}

/**
 * Whether a declared variable is read anywhere.
 * @param {import('eslint').Scope.Variable | undefined} variable
 */
const isRead = (variable) =>
	variable !== undefined && variable.references.some((reference) => reference.isRead());

/**
 * Whether the binding pattern `param`, declared by `owner`, is read.
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node} owner
 * @param {import('estree').Pattern} param
 */
function patternRead(context, owner, param) {
	if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern') return true;
	if (param.type === 'RestElement') return patternRead(context, owner, param.argument);
	if (param.type === 'AssignmentPattern') return patternRead(context, owner, param.left);
	if (param.type !== 'Identifier' || param.name.startsWith('_')) return false;

	return isRead(
		context.sourceCode.getDeclaredVariables(owner).find((variable) => variable.name === param.name)
	);
}

/**
 * Whether the function reads the error it is called with.
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').ArrowFunctionExpression | import('estree').FunctionExpression} fn
 */
function readsError(context, fn) {
	// TypeScript's `this` pseudo-parameter comes first but is not an argument.
	const first = fn.params.find((param) => param.type !== 'Identifier' || param.name !== 'this');
	if (first !== undefined) return patternRead(context, fn, first);
	if (fn.type !== 'FunctionExpression') return false;

	return isRead(context.sourceCode.getScope(fn).set.get('arguments'));
}

/**
 * Whether the identifier names an import from neverthrow.
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node} node
 */
function isNeverthrowImport(context, node) {
	if (node.type !== 'Identifier') return false;
	for (let scope = context.sourceCode.getScope(node); scope !== null; scope = scope.upper) {
		const variable = scope.set.get(node.name);
		if (variable === undefined) continue;

		return variable.defs.some(
			(def) => def.type === 'ImportBinding' && def.parent.source.value === 'neverthrow'
		);
	}

	return false;
}

/**
 * The expression with any transparent wrappers and parentheses taken off.
 * @param {import('estree').Node} node
 */
function unwrapped(node) {
	let inner = node;
	// `await` keeps its operand in `argument`; the others in `expression`.
	while (TRANSPARENT.has(inner.type)) inner = inner.expression ?? inner.argument;

	return inner;
}

/** @type {import('eslint').Rule.RuleModule} */
export const noIgnoredError = {
	meta: {
		type: 'problem',
		docs: { description: 'Disallow catching an error and dropping it' },
		messages: {
			ignored:
				'This handler drops the error it catches, so a failure looks like an ordinary answer. Read the error: report it (log it), wrap it as a cause, or branch on it.',
			unwrapOr:
				'unwrapOr drops the error it replaces. Report it first with `.orTee(report).unwrapOr(fallback)`, or handle it with match or orElse.'
		},
		schema: []
	},
	create(context) {
		const services = context.sourceCode.parserServices;
		const program = services?.program ?? undefined;
		const checker = program?.getTypeChecker();
		/** @param {import('estree').Node} node */
		const typeOf = (node) => {
			const tsNode = services?.esTreeNodeToTSNodeMap?.get(node);

			return tsNode === undefined || checker === undefined
				? undefined
				: checker.getTypeAtLocation(tsNode);
		};
		/** @param {import('typescript').Type} type */
		const partsOf = (type) => (type.isUnion() ? type.types : [type]);
		/** @param {import('typescript').Type} type */
		const isResultType = (type) =>
			program !== undefined &&
			partsOf(type).some((part) => typeMatchesSpecifier(part, RESULT_TYPES, program));
		/** @param {import('estree').Node} node */
		const isResult = (node) => {
			const type = typeOf(node);

			return type !== undefined && isResultType(type);
		};
		/** Whether every Result in the type has `never` for its error. */
		const cannotFail = (node) => {
			const type = typeOf(node);
			if (type === undefined || checker === undefined || program === undefined) return false;
			const results = partsOf(type).filter((part) =>
				typeMatchesSpecifier(part, RESULT_TYPES, program)
			);

			return (
				results.length > 0 &&
				results.every((part) => {
					const error = checker.getTypeArguments(part)[1];

					return error !== undefined && (error.flags & NEVER_FLAG) !== 0;
				})
			);
		};
		/** Whether the receiver of `.catch`/`.then` is a promise, or unknown without types. */
		const isThenable = (node) => {
			const type = typeOf(node);
			if (type === undefined || checker === undefined) return true;

			return partsOf(checker.getApparentType(type)).some(
				(part) => part.getProperty('then') !== undefined
			);
		};
		/** @param {import('estree').Node | undefined} handler */
		const check = (handler) => {
			if (isFunction(handler) && !readsError(context, handler)) {
				context.report({ node: handler, messageId: 'ignored' });
			}
		};
		/** Whether `.orTee(handler)` reports the error before `unwrapOr` takes the fallback. */
		const reportedBefore = (receiver) => {
			let node = unwrapped(receiver);
			while (node.type === 'CallExpression') {
				const name = memberName(node.callee);
				if (name === 'orTee') {
					const [handler] = node.arguments;

					return handler !== undefined && (!isFunction(handler) || readsError(context, handler));
				}

				if (name === undefined || !KEEPS_ERRORS.has(name)) return false;
				node = unwrapped(node.callee.object);
			}

			return false;
		};

		return {
			CatchClause(node) {
				if (node.param === null || node.param === undefined) {
					context.report({ node, messageId: 'ignored' });
				} else if (!patternRead(context, node, node.param)) {
					context.report({ node, messageId: 'ignored' });
				}
			},
			CallExpression(node) {
				const { callee } = node;
				const args = node.arguments;
				if (callee.type === 'Identifier') {
					if (MAPS_THROWN.has(callee.name) && isNeverthrowImport(context, callee)) check(args[1]);

					return;
				}

				const method = memberName(callee);
				if (method === undefined || callee.type !== 'MemberExpression') return;
				if (method === 'catch' || method === 'then') {
					if (isThenable(callee.object)) check(method === 'catch' ? args[0] : args[1]);

					return;
				}

				if (MAPS_THROWN.has(method)) {
					if (isNeverthrowImport(context, callee.object)) check(args[1]);

					return;
				}

				if (!ERROR_FIRST.has(method) && method !== 'match' && method !== 'unwrapOr') return;
				if (!isResult(callee.object)) return;
				if (ERROR_FIRST.has(method)) return check(args[0]);
				if (cannotFail(callee.object)) return;
				if (method === 'match') return check(args[1]);
				if (!reportedBefore(callee.object)) {
					context.report({ node: callee.property, messageId: 'unwrapOr' });
				}
			}
		};
	}
};

/** `ts.TypeFlags.Never`, kept here so the rule does not import TypeScript at load. */
const NEVER_FLAG = 1 << 17;
