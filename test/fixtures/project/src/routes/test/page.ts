/** A route named "test" is product code: it keeps the throw and cast bans. */
export function load(raw: unknown): string {
	if (raw === null) throw new Error('no page');

	return raw as string;
}
