/** Product code may wait on a timer; only tests are held to waiting on conditions. */
export async function backOff(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 100));
}
