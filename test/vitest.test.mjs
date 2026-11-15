import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { POLL_TIMEOUT_FLOOR_MS } from '../vitest/poll-floor.mjs';
import { createVitestConfig as createNextConfig } from '../vitest/nextjs.mjs';
import { createVitestConfig as createNodeConfig } from '../vitest/node.mjs';

describe('expect.poll default timeout', () => {
	it('is the floor the lint rule enforces, so a bare expect.poll survives a loaded machine', () => {
		assert.equal(createNodeConfig().test.expect.poll.timeout, POLL_TIMEOUT_FLOOR_MS);
		assert.equal(
			createNextConfig({ rootDir: import.meta.dirname }).test.expect.poll.timeout,
			POLL_TIMEOUT_FLOOR_MS
		);
	});
});
