import setTimeout = require('node:timers/promises');

export async function sleeps(): Promise<void> {
	// @ts-expect-error: the crash input is the call shape, whatever its types.
	await setTimeout(100);
}
