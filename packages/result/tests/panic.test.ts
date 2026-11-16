import { panic } from '../src/panic.ts';

describe('panic', () => {
	it('stops with an error carrying the message and the cause', () => {
		const cause = new Error('disk full');
		expect(() => panic('could not save the queue', cause)).toThrow(
			expect.objectContaining({ message: 'could not save the queue', cause })
		);
	});
});
