declare function expect(actual: unknown): { toBe(n: unknown): void; toEqual(n: unknown): void };
declare const vi: { getTimerCount(): number };

export function timerCounts(): void {
	expect(vi.getTimerCount()).toBe(2);
	expect(vi.getTimerCount()).toEqual(1);
}

export function allowed(): void {
	// Nothing left pending is a property of the code, not a count of its timers.
	expect(vi.getTimerCount()).toBe(0);
}
