/**
 * Stops the program for a bug or a broken invariant, like Rust's `panic!`. This file is the only
 * production code allowed to throw. A failure the caller can act on returns a neverthrow Result
 * instead.
 */
export function panic(message: string, cause?: unknown): never {
	throw new Error(message, { cause });
}
