// The one way tests unwrap a Result: each fails the test, showing what came instead, when the
// Result is not the one expected. Import from `@davidteju/result/testing`, in tests only.
import { Result } from 'neverthrow';
import { errorMessage } from './errors.ts';
import { panic } from './panic.ts';

/** A payload as JSON, BigInts and Errors shown as text; as `String()` when JSON cannot hold it. */
const shown = (payload: unknown): string =>
	Result.fromThrowable(() =>
		JSON.stringify(payload, (_key, field: unknown) => {
			if (typeof field === 'bigint') return `${String(field)}n`;
			if (field instanceof Error) return `${field.name}: ${field.message}`;

			return field;
		})
	)().match(
		(json) => json,
		(error) => `${String(payload)} (not JSON: ${errorMessage(error)})`
	);

/** The value of a Result a test expects to succeed. */
export function value<T, E>(result: Result<T, E>): T {
	if (result.isErr()) return panic(`expected success, got ${shown(result.error)}`);

	return result.value;
}

/** The error of a Result a test expects to fail. */
export function errorOf<T, E>(result: Result<T, E>): E {
	if (result.isOk()) return panic(`expected a failure, got ${shown(result.value)}`);

	return result.error;
}

/** The message of a Result a test expects to fail. */
export const failureOf = <T>(result: Result<T, { message: string }>): string =>
	errorOf(result).message;

/** As `value`, for a Result still to come. */
export const valueAsync = async <T, E>(result: PromiseLike<Result<T, E>>): Promise<T> =>
	value(await result);

/** As `errorOf`, for a Result still to come. */
export const errorAsync = async <T, E>(result: PromiseLike<Result<T, E>>): Promise<E> =>
	errorOf(await result);

/** As `failureOf`, for a Result still to come. */
export const failureAsync = async <T>(
	result: PromiseLike<Result<T, { message: string }>>
): Promise<string> => failureOf(await result);

/** The list's item at `index`, which the test needs there. */
export function nth<T>(list: readonly T[], index: number): T {
	const item = list[index];
	if (item === undefined)
		return panic(`Expected an item at ${String(index)}, of ${String(list.length)}`);

	return item;
}
