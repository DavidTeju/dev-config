import * as timers from 'node:timers/promises';
import { setTimeout as nap } from 'node:timers/promises';
declare function sleep(ms: number): Promise<void>;
declare function delay(ms: number): unknown;
declare const source: { pipe(op: unknown): unknown };
declare const utils: { sleep(ms: number): Promise<void> };
declare const vi: { advanceTimersByTimeAsync(ms: number): Promise<void> };
declare const ms: 50 | 100;

export async function sleeps(): Promise<void> {
	await new Promise((resolve) => setTimeout(() => resolve(undefined), 100));
	await new Promise<void>((resolve) => {
		setTimeout(function () {
			resolve();
		}, 100);
	});
	await sleep(ms);
	await utils.sleep(100);
	await timers.setTimeout(100);
	await nap(100);
	await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 100));
}

export async function allowed(): Promise<void> {
	// An RxJS or msw delay operator is not awaited: it is not a sleep.
	source.pipe(delay(100));
	// The helper under test, run on fake timers.
	const slept = sleep(1000);
	await vi.advanceTimersByTimeAsync(1000);
	await slept;
}
