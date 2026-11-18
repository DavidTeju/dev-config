export default {
	'*.{ts,tsx}': ['eslint --fix', 'oxfmt --write --no-error-on-unmatched-pattern'],
	'*.{json,md,css}': ['oxfmt --write --no-error-on-unmatched-pattern']
};
