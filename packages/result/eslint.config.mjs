// The package's own configs, from this repository: it is linted by the rules it supports.
import { createConfig } from '../../eslint/config.mjs';

export default [...(await createConfig()), { ignores: ['dist/**', '*.config.mjs'] }];
