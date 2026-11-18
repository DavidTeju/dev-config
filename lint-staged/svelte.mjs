export default {
	'*.{js,ts,svelte}': ['oxfmt --write --no-error-on-unmatched-pattern', 'eslint --fix'],
	'*.{json,md,css}': ['oxfmt --write --no-error-on-unmatched-pattern']
};
