declare function expect(actual: unknown): {
	toBe(n: unknown): void;
	toBeLessThan(n: number): void;
};
declare const assert: { ok(value: unknown): void };
declare function ready(): boolean;
declare function beforeEach(fn: () => void): void;

let started = 0;
beforeEach(() => {
	started = Date.now();
});

export function elapsed(): void {
	expect(Date.now() - started).toBeLessThan(4000);
	const start = Date.now();
	expect((Date.now() - start) / 1000).toBeLessThan(2);
	assert.ok(Date.now() - start < 2000);
}

export function allowed(): void {
	const start = Date.now();
	// On fake timers an exact delta is deterministic.
	expect(Date.now() - start).toBe(1000);
	// A deadline loop is not an assertion.
	while (Date.now() - start < 5000) {
		if (ready()) break;
	}
	const took = Date.now() - start;
	if (took > 3) console.log(took);
}
