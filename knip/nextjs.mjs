/**
 * Knip config for Next.js projects.
 * Extends base config with Next.js-specific ignore patterns.
 *
 * Usage in consuming project's knip.ts:
 *   import { nextjsKnipConfig } from '@davidteju/dev-config/knip/nextjs';
 *   export default { ...nextjsKnipConfig };
 */
import { baseKnipConfig } from './base.mjs';

export const nextjsKnipConfig = {
	...baseKnipConfig,
	ignoreDependencies: [
		...baseKnipConfig.ignoreDependencies,
		// eslint-config-next is referenced in eslint config, not directly imported
		'eslint-config-next'
	]
};
