// The building blocks of every error a module returns. Each is a plain object tagged by `kind`,
// so the compiler tells them apart (empty `Error` subclasses are all the same type to it). A
// module declares its own narrow union of these; each exit translates them once: an HTTP status
// in the server's handler, a message and exit code in a CLI. Browser code too: no Node imports.
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { errorCode } from './guards.ts';
import { panic } from './panic.ts';

/** A step failed for a reason outside the request: a file, a process, a library, the network. */
export interface Failure {
	kind: 'failed';
	message: string;
	cause?: unknown;
}

/** An error that says only what went wrong, tagged with its kind. */
export interface Tagged<K extends string> {
	kind: K;
	message: string;
}

/** What was asked for is not there. */
export type NotFound = Tagged<'not-found'>;

/** What was asked for cannot happen in the state things are in: already done, fixed, or held. */
export type Conflict = Tagged<'conflict'>;

/** The request itself does not fit what it asks of. */
export type Invalid = Tagged<'invalid'>;

/** The caller may not do this. */
export type Forbidden = Tagged<'forbidden'>;

/** What was asked for is of a kind this does not handle: a file that is not Markdown or text. */
export type Unsupported = Tagged<'unsupported'>;

/** What was sent is bigger than its limit. */
export type TooLarge = Tagged<'too-large'>;

/** Stored or received data does not read back as what it should be; `where` names its source. */
export interface Malformed {
	kind: 'malformed';
	message: string;
	where: string;
}

/** A failure saying only what went wrong. */
export const failure = (message: string): Failure => ({ kind: 'failed', message });

/** A caught error or rejection as a Failure, its message after `context` when given. */
export const failed = (cause: unknown, context?: string): Failure => ({
	kind: 'failed',
	message: context === undefined ? errorMessage(cause) : `${context}: ${errorMessage(cause)}`,
	cause,
});

const tagged =
	<K extends string>(kind: K) =>
	(message: string): Tagged<K> => ({ kind, message });

export const notFound = tagged('not-found');
export const conflict = tagged('conflict');
export const invalid = tagged('invalid');
export const forbidden = tagged('forbidden');
export const unsupported = tagged('unsupported');
export const tooLarge = tagged('too-large');

export const malformed = (where: string, message: string): Malformed => ({
	kind: 'malformed',
	message,
	where,
});

/** An error's message, or the thrown value as text. */
export const errorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

/** A thrown value as an Error, for an API that takes one. */
export const toError = (error: unknown): Error =>
	error instanceof Error ? error : new Error(String(error));

/** A thrown value as a Failure saying "`doing` failed: why". */
const failedDoing =
	(doing: string) =>
	(cause: unknown): Failure =>
		failed(cause, `${doing} failed`);

/** Work that may reject or throw: a promise, or a function that makes one. */
type Work<T> = PromiseLike<T> | (() => PromiseLike<T>);

const started = <T>(work: Work<T>): Promise<T> =>
	typeof work === 'function' ? Promise.resolve().then(work) : Promise.resolve(work);

/** A call that may reject, its rejection a Failure: "`doing` failed: why". */
export const attempt = <T>(doing: string, work: Work<T>): ResultAsync<T, Failure> =>
	ResultAsync.fromPromise(started(work), failedDoing(doing));

/**
 * Work that returns no promise: a promise would come back as the value, its rejection unhandled.
 * Async work goes to the `…Async` form.
 */
type SyncWork<T> = (() => T) &
	([Extract<T, PromiseLike<unknown>>] extends [never] ? unknown : never);

/** A call that may throw, its error a Failure: "`doing` failed: why". */
export const attemptSync = <T>(doing: string, work: SyncWork<T>): Result<T, Failure> =>
	Result.fromThrowable((): T => work(), failedDoing(doing))();

/** A thrown error as `fallback` when it is a missing file (ENOENT), else a Failure. */
const unlessMissing =
	<D>(fallback: D, doing: string) =>
	(cause: unknown): Result<D, Failure> =>
		errorCode(cause) === 'ENOENT' ? ok(fallback) : err(failedDoing(doing)(cause));

/** A read whose missing file means `fallback`; any other failure is a Failure. */
export function missingAs<T, D>(
	fallback: D,
	doing: string,
	work: SyncWork<T>
): Result<T | D, Failure> {
	return Result.fromThrowable((): T => work())().orElse(unlessMissing(fallback, doing));
}

/** As `missingAs`, for work that may reject. */
export function missingAsAsync<T, D>(
	fallback: D,
	doing: string,
	work: Work<T>
): ResultAsync<T | D, Failure> {
	return ResultAsync.fromPromise(started(work), (cause: unknown) => cause).orElse(
		unlessMissing(fallback, doing)
	);
}

/** A read that gives `undefined` for a missing file; any other failure is a Failure. */
export const ifThere = <T>(doing: string, work: SyncWork<T>): Result<T | undefined, Failure> =>
	missingAs(undefined, doing, work);

/** As `ifThere`, for work that may reject. */
export const ifThereAsync = <T>(
	doing: string,
	work: Work<T>
): ResultAsync<T | undefined, Failure> => missingAsAsync(undefined, doing, work);

/**
 * Runs `cleanup` however `work` ended, as a `finally` would. A failed cleanup is the error, since
 * the work's own result is no use while what it made is left behind; otherwise the work's result.
 */
export function ensuring<T, E, C, F>(
	work: PromiseLike<Result<T, E>>,
	cleanup: () => PromiseLike<Result<C, F>>
): ResultAsync<T, E | F> {
	const settle = <R>(running: Promise<R>) =>
		running.then(
			(result) => ({ result }),
			(bug: unknown) => ({ bug })
		);
	const run = async (): Promise<Result<T, E | F>> => {
		const done = await settle(started(work));
		const cleaned = await settle(started(cleanup));
		// The work's bug first: a cleanup that then fails too is a symptom, not the cause.
		if ('bug' in done) return panic('Work rejected outside its Result', done.bug);
		if ('bug' in cleaned) return panic('Cleanup rejected outside its Result', cleaned.bug);

		return cleaned.result.andThen(() => done.result);
	};

	return new ResultAsync(run());
}
