interface Shape {
	size: number;
}
export const read = (value: unknown) => value as Shape;
export const fixed = ['a', 'b'] as const;
