import { z } from 'zod';
import { parseJson } from '../src/json.ts';
import { errorOf, value } from '../src/testing.ts';
import { checked, jsonText, maybe } from '../src/zod.ts';

describe('parseJson', () => {
	it('reads JSON text', () => {
		expect(value(parseJson('{"a":1}'))).toEqual({ a: 1 });
	});

	it('says where text that is not JSON came from', () => {
		const bad = errorOf(parseJson('{oops', 'flow.db held call'));
		expect(bad.kind).toBe('malformed');
		expect(bad.where).toBe('flow.db held call');
		expect(bad.message).toMatch(/^flow\.db held call is not JSON: /);
	});
});

describe('checked', () => {
	const ROW = z.object({ id: z.string(), size: z.number() });

	it('gives the value read as the schema', () => {
		expect(value(checked(ROW, { id: 'a', size: 1 }, 'row'))).toEqual({ id: 'a', size: 1 });
	});

	it('says each field that does not fit, and where', () => {
		const bad = errorOf(checked(ROW, { id: 1 }, 'row'));
		expect(bad).toEqual({
			kind: 'malformed',
			where: 'row',
			message:
				'id: Invalid input: expected string, received number; size: Invalid input: expected number, received undefined',
		});
		expect(errorOf(checked(ROW, 'text', 'row')).message).toBe(
			'row: Invalid input: expected object, received string'
		);
	});
});

describe('maybe', () => {
	it('reads a missing field as undefined', () => {
		const SHAPE = z.object({ note: maybe(z.string()) });
		expect(value(checked(SHAPE, {}, 'shape'))).toEqual({ note: undefined });
		expect(value(checked(SHAPE, { note: 'hi' }, 'shape'))).toEqual({ note: 'hi' });
	});
});

describe('jsonText', () => {
	const INPUT = jsonText(z.record(z.string(), z.unknown()));

	it('reads a text column holding JSON as its schema', () => {
		expect(value(checked(INPUT, '{"a":1}', 'input'))).toEqual({ a: 1 });
	});

	it('rejects text that is not JSON, or JSON that does not fit', () => {
		expect(errorOf(checked(INPUT, '{oops', 'input')).message).toMatch(/is not JSON/);
		expect(errorOf(checked(INPUT, '[1]', 'input')).message).toMatch(/expected record/);
	});
});
