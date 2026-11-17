import { err, ok, okAsync, Result, ResultAsync } from 'neverthrow';

const check = (n: number): Result<number, string> => (n > 0 ? ok(n) : err('negative'));
const later = (n: number): ResultAsync<number, string> => okAsync(n);
const report = (error: unknown): void => {
	console.error(error);
};

export async function dropped(): Promise<number> {
	const a = check(1).unwrapOr(0);
	const b = await later(1).unwrapOr(0);
	const c = await Promise.resolve(1).catch(() => 0);
	const d = await Promise.resolve(1).then(undefined, (_error: unknown) => 0);
	const e = check(2).orElse(() => ok(0));
	const f = check(3).match(
		(n) => n,
		() => 0
	);
	const g = check(4).mapErr(() => 'replaced');
	const h = await ResultAsync.fromPromise(Promise.resolve(1), () => 'lost');
	const i = Result.fromThrowable(JSON.parse, () => 'lost')('{}');
	try {
		JSON.parse('{');
	} catch {
		return 0;
	}

	return [a, b, c, d, e, f, g, h, i].length;
}

export async function handled(): Promise<number> {
	const a = check(1).orTee(report).unwrapOr(0);
	const b = await later(1)
		.orTee((error) => {
			report(error);
		})
		.unwrapOr(0);
	const c = await Promise.resolve(1).catch((error: unknown) => {
		report(error);

		return 0;
	});
	const d = await Promise.resolve(1).catch(report);
	const e = check(2).orElse((error) => (error === 'negative' ? ok(0) : err(error)));
	const f = check(3).match(
		(n) => n,
		(error) => error.length
	);
	const g = check(4).mapErr((error) => `wrapped: ${error}`);
	const h = 'text'.match(/x/);
	const i = { unwrapOr: (n: number) => n }.unwrapOr(1);
	try {
		JSON.parse('{');
	} catch (error) {
		report(error);
	}

	return [a, b, c, d, e, f, g, h, i].length;
}
