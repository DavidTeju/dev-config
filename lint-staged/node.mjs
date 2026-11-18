export default {
	'*.ts': ['eslint --fix', 'oxfmt --write --no-error-on-unmatched-pattern'],
	'*.{json,md,mjs,yml,yaml}': ['oxfmt --write --no-error-on-unmatched-pattern']
};
