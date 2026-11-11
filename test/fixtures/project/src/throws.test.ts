export function failInTest(): never {
	throw new Error('tests may throw');
}
