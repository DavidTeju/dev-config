import { err, ok, okAsync, type Result, type ResultAsync } from 'neverthrow';

const check = (n: number): Result<number, string> => (n > 0 ? ok(n) : err('negative'));
const later = (n: number): ResultAsync<number, string> => okAsync(n);

export async function run(): Promise<number> {
	check(1);
	await later(1);
	void check(2);
	const kept = check(3);
	const awaited = await later(3);

	return kept.unwrapOr(0) + awaited.unwrapOr(0);
}
