import { setTimeout } from 'node:timers/promises';
const DELAY_MS = 50;

export async function sleeps(): Promise<void> {
	await setTimeout(100);
	await setTimeout(DELAY_MS);
	await setTimeout(0);
}
