import { errAsync, ok, okAsync } from 'neverthrow';
import {
	attempt,
	attemptSync,
	conflict,
	ensuring,
	failed,
	failure,
	ifThere,
	ifThereAsync,
	missingAs,
	missingAsAsync,
	toError,
	unsupported,
} from '../src/errors.ts';
import { errorAsync, errorOf, value, valueAsync } from '../src/testing.ts';

const missing = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
const denied = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });

describe('the builders', () => {
	it('tag each error with its kind', () => {
		expect(failure('gone wrong')).toEqual({ kind: 'failed', message: 'gone wrong' });
		expect(conflict('done')).toEqual({ kind: 'conflict', message: 'done' });
		expect(unsupported('not text')).toEqual({ kind: 'unsupported', message: 'not text' });
	});

	it('keep what was thrown, its message after the context', () => {
		expect(failed(denied, 'Reading x failed')).toEqual({
			kind: 'failed',
			message: 'Reading x failed: EACCES: permission denied',
			cause: denied,
		});
		expect(failed('plain').message).toBe('plain');
	});

	it('turns a thrown value into an Error', () => {
		expect(toError(denied)).toBe(denied);
		expect(toError('text')).toEqual(new Error('text'));
	});
});

describe('attempt', () => {
	it('gives what the work resolves to', async () => {
		expect(await valueAsync(attempt('Reading', Promise.resolve(3)))).toBe(3);
		expect(await valueAsync(attempt('Reading', () => Promise.resolve(4)))).toBe(4);
	});

	it('names what it was doing when the work rejects or throws', async () => {
		expect(await errorAsync(attempt('Reading x', Promise.reject(denied)))).toEqual(
			failed(denied, 'Reading x failed')
		);
		const throws = (): Promise<number> => {
			throw denied;
		};
		expect((await errorAsync(attempt('Reading y', throws))).message).toBe(
			'Reading y failed: EACCES: permission denied'
		);
		expect(
			errorOf(
				attemptSync('Parsing', () => {
					throw denied;
				})
			).message
		).toBe('Parsing failed: EACCES: permission denied');
	});
});

describe('missingAs and ifThere', () => {
	it('take a missing file as the fallback', async () => {
		const gone = () => {
			throw missing;
		};
		expect(value(missingAs(0, 'Reading', gone))).toBe(0);
		expect(value(ifThere('Reading', gone))).toBeUndefined();
		expect(await valueAsync(missingAsAsync([], 'Reading', Promise.reject(missing)))).toEqual([]);
		expect(
			await valueAsync(ifThereAsync('Reading', () => Promise.reject(missing)))
		).toBeUndefined();
	});

	it('fail on anything else', async () => {
		const locked = () => {
			throw denied;
		};
		expect(errorOf(ifThere('Reading f', locked)).message).toBe(
			'Reading f failed: EACCES: permission denied'
		);
		expect((await errorAsync(ifThereAsync('Reading g', Promise.reject(denied)))).kind).toBe(
			'failed'
		);
		expect(value(ifThere('Reading', () => 'text'))).toBe('text');
	});
});

describe('sync helpers and async work', () => {
	it('take only work that does not return a promise, so a rejection cannot escape as a value', () => {
		// @ts-expect-error -- async work goes to missingAsAsync
		void missingAs(0, 'Reading', () => Promise.resolve(1));
		// @ts-expect-error -- async work goes to ifThereAsync
		void ifThere('Reading', (): number | Promise<number> => Promise.resolve(1));
		// @ts-expect-error -- async work goes to attempt
		void attemptSync('Reading', () => Promise.resolve(1));
		expect(value(ifThere('Reading', () => 2))).toBe(2);
	});
});

describe('ensuring', () => {
	it('cleans up after work that succeeded, and gives its value', async () => {
		const cleaned: string[] = [];
		const done = ensuring(okAsync(1), () => {
			cleaned.push('dir');

			return okAsync(undefined);
		});
		expect(await valueAsync(done)).toBe(1);
		expect(cleaned).toEqual(['dir']);
	});

	it('cleans up after work that failed, and gives its error', async () => {
		const cleaned: string[] = [];
		const done = ensuring(errAsync(failure('work')), () => {
			cleaned.push('dir');

			return Promise.resolve(ok(undefined));
		});
		expect(await errorAsync(done)).toEqual(failure('work'));
		expect(cleaned).toEqual(['dir']);
	});

	it('fails when the cleanup fails, whatever the work did', async () => {
		expect(await errorAsync(ensuring(okAsync(1), () => errAsync(failure('rm'))))).toEqual(
			failure('rm')
		);
		expect(
			await errorAsync(ensuring(errAsync(failure('work')), () => errAsync(failure('rm'))))
		).toEqual(failure('rm'));
	});

	it('stops the program over the work, not the cleanup, when both reject', async () => {
		const done = ensuring(Promise.reject(denied), () => Promise.reject(new Error('rm crashed')));
		await expect(done).rejects.toThrow('Work rejected outside its Result');
		await expect(done).rejects.toHaveProperty('cause', denied);
	});

	it('cleans up before a rejected work stops the program', async () => {
		const cleaned: string[] = [];
		const done = ensuring(Promise.reject(denied), () => {
			cleaned.push('dir');

			return okAsync(undefined);
		});
		await expect(done).rejects.toThrow('Work rejected outside its Result');
		expect(cleaned).toEqual(['dir']);
	});
});
