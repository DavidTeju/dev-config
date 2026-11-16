import { err, ok, type Result } from 'neverthrow';

/** A test helper outside a *.test.ts file: it may cast and throw, but must not drop a Result. */
const save = (key: string): Result<string, string> => (key === '' ? err('empty') : ok(key));

export function fakeStore(raw: unknown): Map<string, string> {
	if (raw === null) throw new Error('a fake needs a value');

	save('seed');

	return raw as Map<string, string>;
}
