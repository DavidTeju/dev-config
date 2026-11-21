/**
 * Loads `@vitest/eslint-plugin` for the Vitest rules; `undefined` when the project has no Vitest.
 *
 * @param {object} [deps]
 * @param {() => Promise<{ default: import('eslint').ESLint.Plugin }>} [deps.importPlugin]
 * @param {() => boolean} [deps.hasVitest] - Whether the project installs `vitest`.
 * @returns {Promise<import('eslint').ESLint.Plugin | undefined>}
 */
export async function loadVitestPlugin({
	importPlugin = () => import('@vitest/eslint-plugin'),
	hasVitest = () => resolves('vitest')
} = {}) {
	try {
		return (await importPlugin()).default;
	} catch (error) {
		if (!isMissing(error, '@vitest/eslint-plugin')) {
			throw new Error('@vitest/eslint-plugin is installed but did not load', { cause: error });
		}
		if (hasVitest()) {
			throw new Error(
				'vitest is installed but @vitest/eslint-plugin is not, so the Vitest lint rules ' +
					'(no-disabled-tests among them) would not run.\n' +
					'Install it: npm install -D @vitest/eslint-plugin',
				{ cause: error }
			);
		}

		return undefined;
	}
}

/**
 * Whether `error` is Node saying `name` itself is not installed, not a package it imports.
 *
 * @param {unknown} error
 * @param {string} name
 */
function isMissing(error, name) {
	return (
		error instanceof Error &&
		'code' in error &&
		error.code === 'ERR_MODULE_NOT_FOUND' &&
		error.message.includes(`'${name}'`)
	);
}

/** @param {string} specifier */
function resolves(specifier) {
	try {
		import.meta.resolve(specifier);

		return true;
	} catch {
		return false;
	}
}
