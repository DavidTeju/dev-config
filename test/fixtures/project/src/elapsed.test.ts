declare function expect(actual: unknown): { toBeLessThan(n: number): void; toBe(n: unknown): void };
declare const assert: { ok(value: unknown): void };
const HOUR_MS = 3_600_000;

export function elapsed(): void {
	const started = Date.now();
	expect(Date.now() - started).toBeLessThan(4000);
	const t0 = performance.now();
	const took = performance.now() - t0;
	expect(took).toBeLessThan(1000);
	assert.ok(Date.now() - started < 2000);
}

export function allowed(): void {
	// A timestamp in the past is not a measured duration.
	const anHourAgo = Date.now() - HOUR_MS;
	expect(anHourAgo).toBe(anHourAgo);
	const seconds = (Date.now() - 6000) / 1000;
	expect(seconds).toBe(seconds);
}
