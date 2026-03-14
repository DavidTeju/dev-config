/**
 * Knip config for SvelteKit projects.
 * Extends base config with SvelteKit-specific ignore patterns.
 *
 * Usage in consuming project's knip.ts:
 *   import { svelteKnipConfig } from '@davidteju/dev-config/knip/svelte';
 *   export default { ...svelteKnipConfig };
 */
import { baseKnipConfig } from './base.mjs';

export const svelteKnipConfig = {
	...baseKnipConfig,
	ignoreDependencies: [
		...baseKnipConfig.ignoreDependencies,
		// eslint-plugin-svelte is bundled in dev-config
		'eslint-plugin-svelte'
	]
};
