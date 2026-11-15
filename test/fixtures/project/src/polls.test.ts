declare const expect: {
	poll(fn: () => unknown, options?: { timeout?: number; interval?: number }): unknown;
};
declare const vi: {
	waitFor(fn: () => unknown, options?: number | { timeout?: number }): Promise<unknown>;
};
const SHORT_MS = 300;

export async function polls(): Promise<void> {
	expect.poll(() => 1, { timeout: 500 });
	expect.poll(() => 1, { interval: 10, timeout: SHORT_MS });
	await vi.waitFor(() => 1, 200);
	await vi.waitFor(() => 1, { timeout: 1000 });
	await vi.waitFor(() => 1);
}

export async function allowed(): Promise<void> {
	// The shared Vitest config sets the floor as the default for expect.poll.
	expect.poll(() => 1);
	expect.poll(() => 1, { interval: 10 });
	expect.poll(() => 1, { timeout: 5000 });
	await vi.waitFor(() => 1, { timeout: 10_000 });
}
