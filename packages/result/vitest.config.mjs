import { createVitestConfig } from '../../vitest/node.mjs';

export default createVitestConfig({
	rootDir: import.meta.dirname,
	include: ['tests/**/*.test.ts'],
});
