import { err, fromPromise, fromThrowable, ok, okAsync, type Result } from 'neverthrow';

const check = (n: number): Result<number, string> => (n > 0 ? ok(n) : err('negative'));
const report = (error: unknown): void => {
	console.error(error);
};
/** A schema-like builder with a `catch` of its own, as zod has. */
const schema = { catch: (fallback: () => string) => fallback() };

export async function dropped(): Promise<number> {
	const a = await fromPromise(Promise.resolve(1), () => 'lost');
	const b = fromThrowable(JSON.parse, () => 'lost')('{}');
	const c = await Promise.resolve(1)['catch'](() => 0);
	try {
		JSON.parse('{');
	} catch (error) {
		error = 1;
	}

	return [a, b, c].length;
}

export async function handled(): Promise<number> {
	const a = schema.catch(() => 'fallback');
	const b = await Promise.resolve(1).catch((...args: unknown[]) => {
		report(args);

		return 0;
	});
	const c = await Promise.resolve(1).catch(function () {
		report(arguments);

		return 0;
	});
	const d = await Promise.resolve(1).catch((error: unknown = 1) => {
		report(error);

		return 0;
	});
	const e = check(1).match(
		(n) => n,
		function (this: void, error) {
			return error.length;
		}
	);
	const f = (await okAsync(1).orTee(report)).unwrapOr(0);
	const g = check(2).orTee(report)!.unwrapOr(0);
	const h = check(3)
		.orTee(report)
		.map((n) => n + 1)
		.unwrapOr(0);
	const i = ok(1).unwrapOr(0);

	return [a, b, c, d, e, f, g, h, i].length;
}
