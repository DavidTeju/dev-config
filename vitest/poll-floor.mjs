/**
 * The shortest time a test may give `expect.poll` or `vi.waitFor` to see its condition. Vitest's
 * own 1 s default fails on a machine running several suites at once, and a longer wait costs
 * nothing when the condition holds: the poll returns as soon as it does. The shared Vitest configs
 * make it the `expect.poll` default, and `@davidteju/poll-timeout-floor` holds explicit timeouts
 * to it.
 */
export const POLL_TIMEOUT_FLOOR_MS = 5000;
