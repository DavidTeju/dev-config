/**
 * Knip config for SvelteKit projects.
 *
 * Usage in consuming project's knip.js:
 *   import { svelteKnipConfig } from '@davidteju/dev-config/knip/svelte';
 *   export default { ...svelteKnipConfig };
 */
import { baseKnipConfig } from './base.mjs';

export const svelteKnipConfig = {
	...baseKnipConfig
};
