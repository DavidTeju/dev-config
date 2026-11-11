import { typeMatchesSpecifier } from '@typescript-eslint/type-utils';
import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * Reports a neverthrow Result that is computed and then dropped, the way Rust's `#[must_use]`
 * warns about an unused `Result`. A dropped Result is a swallowed error. `void result` discards
 * one on purpose (its type is `undefined`, so it is never reported). An unawaited `ResultAsync` is
 * left to `@typescript-eslint/no-floating-promises`, which reports it because it is thenable.
 * Needs type information.
 */

const RESULT = /** @type {const} */ ({
	from: 'package',
	package: 'neverthrow',
	name: ['Ok', 'Err']
});
const NEVERTHROW_FILE = /[\\/]node_modules[\\/]neverthrow[\\/]/;

/** Whether each program loads neverthrow at all; the rule does nothing in one that does not. */
const usesNeverthrow = new WeakMap();

/** @param {import('typescript').Program} program */
function loadsNeverthrow(program) {
	let loads = usesNeverthrow.get(program);
	if (loads === undefined) {
		loads = program.getSourceFiles().some((file) => NEVERTHROW_FILE.test(file.fileName));
		usesNeverthrow.set(program, loads);
	}
	return loads;
}

/**
 * @param {import('typescript').Type} type
 * @param {import('typescript').Program} program
 */
const isResult = (type, program) =>
	type.isUnion()
		? type.types.some((part) => isResult(part, program))
		: typeMatchesSpecifier(type, RESULT, program);

/** @type {import('eslint').Rule.RuleModule} */
export const mustUseResult = {
	meta: {
		type: 'problem',
		docs: { description: 'Require every neverthrow Result to be used' },
		messages: {
			dropped:
				'This Result is dropped, so its error is swallowed. Handle it (check isErr(), match, map or return it), or discard it on purpose with `void`.'
		},
		schema: []
	},
	create(context) {
		const services = ESLintUtils.getParserServices(context);
		if (!loadsNeverthrow(services.program)) return {};
		return {
			ExpressionStatement(node) {
				// An assignment's type is its right-hand side's, but assigning is a use.
				if (node.expression.type === 'AssignmentExpression') return;
				if (isResult(services.getTypeAtLocation(node.expression), services.program)) {
					context.report({ node, messageId: 'dropped' });
				}
			}
		};
	}
};
