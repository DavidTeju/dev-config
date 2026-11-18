import stylistic from '@stylistic/eslint-plugin';

const padding = stylistic.rules['padding-line-between-statements'];

/**
 * Svelte owns script statements under SvelteScriptElement rather than Program.
 * Give Stylistic the normal script parent when checking those direct statements.
 * Its options, nested-scope handling, comments and autofixes remain shared.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const svelteScriptPadding = {
	meta: padding.meta,
	create(context) {
		const listeners = padding.create(context);
		const verify = listeners[':statement'];
		const exitScope = listeners['BlockStatement:exit'];
		return {
			...listeners,
			SvelteScriptElement() {
				listeners.Program?.(context.sourceCode.ast);
			},
			'SvelteScriptElement:exit'() {
				if (exitScope) Reflect.apply(exitScope, undefined, []);
			},
			/** @param {import('estree').Node & { parent?: { type: string } }} node */
			':statement'(node) {
				const statement =
					node.parent?.type === 'SvelteScriptElement'
						? { ...node, parent: context.sourceCode.ast }
						: node;
				if (verify) Reflect.apply(verify, undefined, [statement]);
			}
		};
	}
};
