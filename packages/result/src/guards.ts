/** Type guards that check a value at run time, so code can narrow a type instead of casting it. */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** A thrown value's string `code` (Node's `ENOENT`, `EPERM` and the like), if it has one. */
export const errorCode = (error: unknown): string | undefined => {
	if (!isRecord(error)) return undefined;

	const code = error.code;

	return typeof code === 'string' ? code : undefined;
};

/** A failed command's exit status: `status` from `execFileSync`, a numeric `code` from `execFile`. */
export const exitStatus = (error: unknown): number | undefined => {
	if (!isRecord(error)) return undefined;

	const status = error.status;
	if (typeof status === 'number') return status;

	const code = error.code;

	return typeof code === 'number' ? code : undefined;
};

/** `value` if it is a string, else `fallback`. */
export function stringOr(value: unknown): string | undefined;

export function stringOr<F>(value: unknown, fallback: F): string | F;

export function stringOr(value: unknown, fallback?: unknown): unknown {
	return typeof value === 'string' ? value : fallback;
}

/** `value` if it is a number, else `fallback`. */
export function numberOr(value: unknown): number | undefined;

export function numberOr<F>(value: unknown, fallback: F): number | F;

export function numberOr(value: unknown, fallback?: unknown): unknown {
	return typeof value === 'number' ? value : fallback;
}

/** Whether `key` is one of the object's own keys. */
export const hasKey = <T extends object>(object: T, key: PropertyKey): key is keyof T =>
	Object.hasOwn(object, key);

/** A guard for the keys of `table`: a closed set of names written as an object's keys. */
export const isKeyOf =
	<T extends object>(table: T) =>
	(value: unknown): value is keyof T & string =>
		typeof value === 'string' && hasKey(table, value);

/** The object's own string keys, typed as its keys. */
export const keysOf = <T extends object>(object: T): (keyof T & string)[] =>
	Object.keys(object).filter((key): key is keyof T & string => hasKey(object, key));

const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/** A UUID's shape, the same as `UUID` from `node:crypto`, without needing Node's types. */
export type Uuid = `${string}-${string}-${string}-${string}-${string}`;

export const isUuid = (value: unknown): value is Uuid =>
	typeof value === 'string' && UUID_PATTERN.test(value);
