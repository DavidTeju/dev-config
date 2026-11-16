/** A Playwright helper beside the e2e specs: test code, so it may throw and cast. */
export function signIn(raw: unknown): string {
	if (raw === null) throw new Error('no user');

	return raw as string;
}
