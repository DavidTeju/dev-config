// Formats this package with its own base preset; its code is written without trailing commas.
import base from './prettier/base.mjs';

export default { ...base, trailingComma: 'none' };
