import * as root from '../src/index.ts';

describe('the package root', () => {
	it('exports the helpers that need no zod', () => {
		expect(new Set(Object.keys(root))).toEqual(
			new Set([
				'attempt',
				'attemptSync',
				'conflict',
				'ensuring',
				'errorCode',
				'errorMessage',
				'exitStatus',
				'failed',
				'failure',
				'forbidden',
				'hasKey',
				'ifThere',
				'ifThereAsync',
				'invalid',
				'isKeyOf',
				'isRecord',
				'isUuid',
				'keysOf',
				'malformed',
				'missingAs',
				'missingAsAsync',
				'notFound',
				'numberOr',
				'panic',
				'parseJson',
				'stringOr',
				'toError',
				'tooLarge',
				'unchecked',
				'unsupported',
			])
		);
	});
});
