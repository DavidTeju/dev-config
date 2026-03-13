# @davidteju/dev-config

Shared ESLint, Prettier, TypeScript, Vitest, and lint-staged configs for my projects.

Install from GitHub:

```bash
npm install --save-dev github:DavidTeju/dev-config
```

## What's included

| Export path | Description |
| --- | --- |
| `./eslint/base` | Base ESLint flat config + strict rules + file overrides |
| `./eslint/svelte` | Pre-composed ESLint config for SvelteKit |
| `./eslint/nextjs` | ESLint config pieces for Next.js (compose yourself) |
| `./prettier/svelte` | Prettier config with svelte + tailwind plugins |
| `./prettier/nextjs` | Prettier config with tailwind plugin |
| `./tsconfig/svelte` | TypeScript config for SvelteKit |
| `./tsconfig/nextjs` | TypeScript config for Next.js |
| `./vitest/nextjs` | Vitest config factory for Next.js (jsdom + React + `@` alias) |
| `./lint-staged/svelte` | lint-staged config for SvelteKit |
| `./lint-staged/nextjs` | lint-staged config for Next.js |

## ESLint

All ESLint configs use the [flat config](https://eslint.org/docs/latest/use/configure/configuration-files) format (ESLint 9+).

### SvelteKit

`svelteConfig()` returns a complete, ready-to-use config array:

```js
// eslint.config.js
import { svelteConfig } from '@davidteju/dev-config/eslint/svelte';
import svelteConf from './svelte.config.js';

export default svelteConfig({ svelteConfig: svelteConf });
```

### Next.js

Next.js re-exports individual config pieces for you to compose with `eslint-config-next`:

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import {
  strictRules,
  testFileOverrides,
  vitestTestOverrides,
  scriptFileOverrides,
} from '@davidteju/dev-config/eslint/nextjs';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  strictRules,
  testFileOverrides,
  vitestTestOverrides,
  scriptFileOverrides,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
```

### What the ESLint configs enforce

**`strictRules`** -- applied to all source files:

- Prettier as an ESLint rule (`prettier/prettier: error`)
- TypeScript strictness: no `any`, consistent type imports, no non-null assertions
- Bans `as any` and `as unknown as X` double casts via AST selectors
- Code quality: complexity cap (15), no nested ternaries, no param reassignment
- Security: no `eval` / `implied-eval`

**`testFileOverrides`** -- relaxes strict rules for test files (`**/*.{test,spec}.{ts,tsx}`, `**/__tests__/**`, `**/benchmark/**`):

- Allows `any`, type casts, non-null assertions, `console`, and raw `Date` usage

**`vitestTestOverrides`** -- adds Vitest-specific lint rules (requires `@vitest/eslint-plugin`):

- `vitest/no-conditional-in-test`: bans `if` statements inside test bodies
- `vitest/no-conditional-expect`: bans conditional `expect()` calls

Gracefully degrades to a no-op `{}` if `@vitest/eslint-plugin` is not installed.

**`scriptFileOverrides`** -- relaxes rules for `scripts/**/*.ts` (CLI tooling, build scripts).

## Prettier

```js
// prettier.config.mjs (Next.js)
export { default } from '@davidteju/dev-config/prettier/nextjs';

// prettier.config.mjs (SvelteKit)
export { default } from '@davidteju/dev-config/prettier/svelte';
```

Both configs use tabs, single quotes, 100-char print width, and `prettier-plugin-tailwindcss`. The Svelte config additionally includes `prettier-plugin-svelte` and sets `trailingComma: 'none'`.

## TypeScript

```jsonc
// tsconfig.json (Next.js)
{
  "extends": "@davidteju/dev-config/tsconfig/nextjs",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```jsonc
// tsconfig.json (SvelteKit)
{
  "extends": "@davidteju/dev-config/tsconfig/svelte"
}
```

> **Note:** `paths` must be defined in the consuming project's tsconfig, not the shared one, because TypeScript resolves paths relative to the tsconfig file location.

## Vitest

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config';
import { createVitestConfig } from '@davidteju/dev-config/vitest/nextjs';

export default defineConfig(
  createVitestConfig({
    rootDir: import.meta.dirname,
    setupFiles: ['./src/test/setup.ts'],
    env: { DATABASE_URL: 'postgres://localhost/test' },
  })
);
```

The factory sets up jsdom, `@vitejs/plugin-react`, `@` path alias to `src/`, v8 coverage, and scopes test discovery to `src/**/*.{test,spec}.{ts,tsx}`.

## lint-staged

```js
// lint-staged.config.mjs (Next.js)
export { default } from '@davidteju/dev-config/lint-staged/nextjs';

// lint-staged.config.mjs (SvelteKit)
export { default } from '@davidteju/dev-config/lint-staged/svelte';
```

## Peer dependencies

Required: `eslint`, `prettier`, `typescript`

Optional (install only what your framework needs):

| Peer | Used by |
| --- | --- |
| `eslint-config-next` | `eslint/nextjs` |
| `prettier-plugin-svelte` | `prettier/svelte` |
| `prettier-plugin-tailwindcss` | `prettier/svelte`, `prettier/nextjs` |
| `vitest` | `vitest/nextjs` |
| `@vitest/eslint-plugin` | `vitestTestOverrides` in `eslint/base` |

## License

MIT
