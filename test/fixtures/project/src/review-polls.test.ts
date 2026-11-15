declare const vi: {
	waitFor(fn: () => unknown, options?: number | { timeout?: number }): Promise<unknown>;
	waitUntil(fn: () => unknown, options?: number | { timeout?: number }): Promise<unknown>;
	getTimerCount(): number;
};
declare function expect(actual: unknown): { toBe(n: unknown): void };
declare const opts: { timeout?: number };
declare const args: [() => unknown];

export async function polls(): Promise<void> {
	await vi.waitUntil(() => 1);
	// prettier-ignore
	await vi.waitFor(() => 1, { 'timeout': 500 });
	// prettier-ignore
	await vi.waitFor((() => 1));
}

export async function allowed(): Promise<void> {
	await vi.waitFor(() => 1, { ...opts });
	await vi.waitFor(...args);
	const before = vi.getTimerCount();
	expect(vi.getTimerCount()).toBe(before);
}
