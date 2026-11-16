// The zod helpers every boundary reads with: a wire format, a stored row, a tool's arguments.
// Browser code too: no Node imports at run time. Import from `@davidteju/result/zod`.
import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod';
import { type Malformed, malformed } from './errors.ts';
import { parseJson } from './json.ts';

/**
 * A field typed `T | undefined`: JSON leaves it out when it is `undefined`, so what is read may
 * lack it, and it reads as `undefined` then. The key stays in the read type, as in the named one.
 */
export const maybe = <T>(schema: z.ZodType<T>) =>
	schema.optional().transform((value): T | undefined => value);

/** A field SQLite or an API gives as `null` when empty, read as `T | undefined`. */
export const nullable = <T>(schema: z.ZodType<T>) =>
	schema.nullish().transform((value): T | undefined => value ?? undefined);

/** zod's complaints as one line, each `path: message`, with `root` for the value itself. */
export const issuesText = (error: z.ZodError, root: string): string =>
	error.issues
		.map((issue) => `${issue.path.map(String).join('.') || root}: ${issue.message}`)
		.join('; ');

/** `value` read as `schema`, or `Malformed` saying what does not fit, `where` for the value. */
export function checked<T>(
	schema: z.ZodType<T>,
	value: unknown,
	where: string
): Result<T, Malformed> {
	const read = schema.safeParse(value);

	return read.success ? ok(read.data) : err(malformed(where, issuesText(read.error, where)));
}

/** A text column or field that holds JSON, read as `schema`. */
export const jsonText = <T>(schema: z.ZodType<T>) =>
	z
		.string()
		.transform((text, context): unknown => {
			const parsed = parseJson(text, 'the text');
			if (parsed.isOk()) return parsed.value;

			context.issues.push({ code: 'custom', message: parsed.error.message, input: text });

			return z.NEVER;
		})
		.pipe(schema);
