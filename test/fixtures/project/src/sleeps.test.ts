declare const page: {
	waitForTimeout(ms: number): Promise<void>;
	evaluate(fn: () => unknown): Promise<unknown>;
};
declare function sleep(ms: number): Promise<void>;
declare function wait(predicate: () => boolean): Promise<void>;
declare const scheduler: { wait(ms: number): Promise<void> };
const DELAY_MS = 50;

export async function sleeps(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 100));
	await new Promise<void>((done) => setTimeout(() => done(), DELAY_MS));
	await new Promise(function (resolve) {
		setTimeout(resolve, 20);
	});
	await sleep(400);
	await page.waitForTimeout(1000);
	await page.evaluate(() => new Promise((done) => setTimeout(done, 50)));
	await scheduler.wait(200);
}

export async function allowed(): Promise<void> {
	// One turn of the event loop is not a clock wait.
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => setTimeout(resolve));
	// Waiting on a condition is the fix.
	await wait(() => true);
	// A timer that does work, rather than resolve a sleep, is the code under test's business.
	setTimeout(() => console.log('later'), 100);
	// A watchdog raced against the real outcome resolves with a value; it is not a sleep.
	await Promise.race([
		wait(() => true),
		new Promise((resolve) => setTimeout(() => resolve('timed out'), DELAY_MS))
	]);
}
