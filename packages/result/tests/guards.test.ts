import {
	errorCode,
	exitStatus,
	hasKey,
	isKeyOf,
	isRecord,
	isUuid,
	keysOf,
	numberOr,
	stringOr,
} from '../src/guards.ts';

describe('isRecord', () => {
	it('accepts plain objects and rejects null, arrays and primitives', () => {
		expect(isRecord({ a: 1 })).toBe(true);
		expect(isRecord(null)).toBe(false);
		expect(isRecord([1])).toBe(false);
		expect(isRecord('text')).toBe(false);
	});
});

describe('errorCode', () => {
	it("reads a Node error's code", () => {
		const missing = Object.assign(new Error('gone'), { code: 'ENOENT' });
		expect(errorCode(missing)).toBe('ENOENT');
	});

	it('is undefined when the thrown value has no string code', () => {
		expect(errorCode(new Error('plain'))).toBeUndefined();
		expect(errorCode('a string')).toBeUndefined();
		expect(errorCode({ code: 2 })).toBeUndefined();
		expect(errorCode(null)).toBeUndefined();
	});
});

describe('hasKey', () => {
	const units = { s: 1000, m: 60_000 };

	it("accepts the object's own keys only", () => {
		expect(hasKey(units, 's')).toBe(true);
		expect(hasKey(units, 'h')).toBe(false);
		expect(hasKey(units, 'toString')).toBe(false);
	});
});

describe('keysOf', () => {
	it("lists the object's own keys", () => {
		expect(keysOf({ a: 1, b: 2 })).toEqual(['a', 'b']);
	});
});

describe('isUuid', () => {
	it('accepts a UUID and rejects other text', () => {
		expect(isUuid('3f2b1c4e-8a7d-4f6e-9b5a-1c2d3e4f5a6b')).toBe(true);
		expect(isUuid('not-a-uuid')).toBe(false);
		expect(isUuid(undefined)).toBe(false);
	});
});

describe('exitStatus', () => {
	it("reads execFileSync's status and execFile's numeric code", () => {
		expect(exitStatus(Object.assign(new Error('ps'), { status: 1 }))).toBe(1);
		expect(exitStatus(Object.assign(new Error('launchctl'), { code: 113 }))).toBe(113);
	});

	it('is undefined for a command that never ran', () => {
		expect(exitStatus(Object.assign(new Error('spawn'), { code: 'ENOENT' }))).toBeUndefined();
		expect(exitStatus('boom')).toBeUndefined();
	});
});

describe('stringOr and numberOr', () => {
	it('keep a value of their type and give the fallback for anything else', () => {
		expect(stringOr('a')).toBe('a');
		expect(stringOr(1)).toBeUndefined();
		expect(stringOr(null, '')).toBe('');
		expect(numberOr(2)).toBe(2);
		expect(numberOr('2', 0)).toBe(0);
	});
});

describe('isKeyOf', () => {
	const isUnit = isKeyOf({ s: 1000, m: 60_000 });

	it("accepts the table's own keys only", () => {
		expect(isUnit('m')).toBe(true);
		expect(isUnit('h')).toBe(false);
		expect(isUnit('toString')).toBe(false);
		expect(isUnit(1)).toBe(false);
	});
});
