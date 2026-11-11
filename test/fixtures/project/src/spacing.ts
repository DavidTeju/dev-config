export function steps(a: number): number {
	if (a < 0) return 0;
	const b = a + 1;
	if (b > 10) return 10;
	const c = b * 2;
	return c;
}
