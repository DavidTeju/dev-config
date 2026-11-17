import { err, errAsync, ok, okAsync } from 'neverthrow';
import {
	errorAsync,
	errorOf,
	failureAsync,
	failureOf,
	nth,
	value,
	valueAsync,
} from '../src/testing.ts';

describe('unwrapping a Result in a test', () => {
	it('gives the value or error that was expected', async () => {
		expect(value(ok(1))).toBe(1);
		expect(errorOf(err('no'))).toBe('no');
		expect(failureOf(err({ message: 'why' }))).toBe('why');
		expect(await valueAsync(okAsync(2))).toBe(2);
		expect(await errorAsync(errAsync('later'))).toBe('later');
		expect(await failureAsync(errAsync({ message: 'later why' }))).toBe('later why');
	});

	it('fails the test showing what came instead', () => {
		expect(() => value(err({ kind: 'failed' }))).toThrow('expected success, got {"kind":"failed"}');
		expect(() => errorOf(ok([1]))).toThrow('expected a failure, got [1]');
	});
});

describe('showing what came instead', () => {
	it('survives a circular or BigInt payload, and shows an Error by its message', () => {
		const loop: Record<string, unknown> = {};
		loop.self = loop;
		expect(() => value(err(loop))).toThrow('expected success, got [object Object]');
		expect(() => value(err(loop))).toThrow('(not JSON: Converting circular structure to JSON');
		expect(() => errorOf(ok(1n))).toThrow('expected a failure, got "1n"');
		expect(() => value(err({ cause: new Error('disk full') }))).toThrow(
			'expected success, got {"cause":"Error: disk full"}'
		);
	});
});

describe('nth', () => {
	it('gives the item a test needs, or fails naming the list length', () => {
		expect(nth(['a', 'b'], 1)).toBe('b');
		expect(() => nth(['a'], 3)).toThrow('Expected an item at 3, of 1');
	});
});
