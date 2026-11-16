// JSON text read as a Result. Browser code too: no Node imports at run time.
import { Result } from 'neverthrow';
import { errorMessage, type Malformed, malformed } from './errors.ts';

/**
 * `text` as JSON, or `Malformed` saying why it is not, with `where` naming where it came from: a
 * stored row, a file, a process's output. What it holds is still unchecked; read it with
 * `checked` (zod.ts) or a guard.
 */
export const parseJson = (text: string, where = 'text'): Result<unknown, Malformed> =>
	Result.fromThrowable(
		(): unknown => JSON.parse(text),
		(error) => malformed(where, `${where} is not JSON: ${errorMessage(error)}`)
	)();
