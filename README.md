# @davidteju/dev-config

Shared ESLint, Prettier, TypeScript, Vitest, and lint-staged configs for my projects.

Install from GitHub:

```bash
npm install --save-dev github:DavidTeju/dev-config
```

## What's included

| Export path              | Description                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `./eslint`               | `createConfig()`: the whole ESLint flat config, for Node, SvelteKit or Next.js           |
| `./prettier/base`        | Base Prettier config (tabs, single quotes, no framework plugins)                         |
| `./prettier/svelte`      | Prettier config with svelte + tailwind plugins                                           |
| `./prettier/nextjs`      | Prettier config with tailwind plugin                                                     |
| `./tsconfig/node`        | TypeScript config for plain Node/backend services (NodeNext, ESM, strict)                |
| `./tsconfig/node-native` | `node` preset for TypeScript that Node runs directly with type stripping (no build step) |
| `./tsconfig/svelte`      | TypeScript config for SvelteKit                                                          |
| `./tsconfig/nextjs`      | TypeScript config for Next.js                                                            |
| `./vitest/node`          | Vitest config factory for plain Node/TS services (node env + optional `@` alias)         |
| `./vitest/nextjs`        | Vitest config factory for Next.js (jsdom + React + `@` alias)                            |
| `./lint-staged/node`     | lint-staged config for Node/TS services                                                  |
| `./lint-staged/svelte`   | lint-staged config for SvelteKit                                                         |
| `./lint-staged/nextjs`   | lint-staged config for Next.js                                                           |

## Node / backend services

For plain Node + TypeScript services (no framework), compose the base pieces:

```jsonc
// tsconfig.json
{
	"extends": "@davidteju/dev-config/tsconfig/node",
	"compilerOptions": { "outDir": "dist", "rootDir": "." },
	"include": ["src", "bin", "test"]
}
```

```js
// eslint.config.mjs — the base factory is framework-less; omit `framework`.
// Type-aware rules are on by default; pass `{ typeChecked: false }` only where type information is unavailable.
import { createConfig } from '@davidteju/dev-config/eslint';
export default await createConfig();
```

```js
// .prettierrc.mjs
export { default } from '@davidteju/dev-config/prettier/base';
```

```js
// vitest.config.mjs
import { createVitestConfig } from '@davidteju/dev-config/vitest/node';
export default createVitestConfig({ rootDir: import.meta.dirname });
```

```js
// lint-staged.config.mjs
export { default } from '@davidteju/dev-config/lint-staged/node';
```

> The `node` tsconfig assumes ESM (`verbatimModuleSyntax`) — set `"type": "module"` in
> `package.json`. It intentionally omits `outDir`/`rootDir` (paths in an extended base
> resolve relative to the base file, not your project) so set those in your own tsconfig.

### Running TypeScript directly with Node

For scripts and CLIs that Node runs as `.ts` with its built-in type stripping (Node 23.6+,
no `tsc` build), extend `node-native` instead. It adds `noEmit`, `allowImportingTsExtensions`
(so imports name the real `.ts` file) and `erasableSyntaxOnly` (rejects enums, namespaces and
parameter properties, which type stripping cannot run), and turns off emit-only options.
`tsc` becomes a type checker only.

```jsonc
// tsconfig.json
{
	"extends": "@davidteju/dev-config/tsconfig/node-native",
	"include": ["*.ts"]
}
```

Keep projects that compile with `tsc` and an `outDir` on `node`:
`allowImportingTsExtensions` requires `noEmit`.

## ESLint

All ESLint configs use the [flat config](https://eslint.org/docs/latest/use/configure/configuration-files) format (ESLint 9+).

`createConfig(options)` returns the whole config array:

- `framework`: `'svelte'` or `'nextjs'`; omit it for plain Node.
- `typeChecked` (default `true`): type-aware rules. Pass `false` only where type information is unavailable.
- `svelteConfig`: the project's imported `svelte.config.js` (SvelteKit only).

```js
// eslint.config.js (SvelteKit)
import { createConfig } from '@davidteju/dev-config/eslint';
import svelteConfig from './svelte.config.js';

export default await createConfig({ framework: 'svelte', svelteConfig });
```

```js
// eslint.config.mjs (Next.js)
import { globalIgnores } from 'eslint/config';
import { createConfig } from '@davidteju/dev-config/eslint';

export default [
	...(await createConfig({ framework: 'nextjs' })),
	globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts'])
];
```

### What the ESLint configs enforce

**All source files:**

- Prettier as an ESLint rule (`prettier/prettier: error`)
- TypeScript strictness: no `any`, consistent type imports, no non-null assertions
- **No type casts** (`consistent-type-assertions: never`; `as const` is allowed). Narrow with a real check instead: `typeof`, `instanceof`, a type guard, or a zod schema for data from outside.
- **No `throw`** (`@davidteju/no-throw`). Return a [neverthrow](https://github.com/supermacro/neverthrow) `Result` for a failure the caller can act on; call `panic()` for a bug.
- **`@davidteju/must-use-result`** reports a neverthrow `Result` that is computed and dropped, like Rust's `#[must_use]`. `void result` discards one on purpose; an unawaited `ResultAsync` is reported by `no-floating-promises`. It does nothing in a project that does not load neverthrow.
- Both rules need type information, which is on by default (`typeChecked: true`). With `typeChecked: false` the throw ban is off too, because a dropped Result could not be caught.
- **Escape hatches, one file each**, so every use is greppable: a file named `unchecked.ts` may cast, and a file named `panic.ts` may throw. Projects put `unchecked<T>()` and `panic()` helpers there.
- Code quality: complexity cap (15), no nested ternaries, no param reassignment
- Security: no `eval` / `implied-eval`

**Test files** get relaxed rules (`**/*.{test,spec}.{ts,tsx}`, `**/__tests__/**`, `**/benchmark/**`):

- Allows `any`, type casts, `throw`, non-null assertions, `console`, and raw `Date` usage

**Vitest rules** for test files, when `@vitest/eslint-plugin` is installed:

- `vitest/no-conditional-in-test`: bans `if` statements inside test bodies
- `vitest/no-conditional-expect`: bans conditional `expect()` calls

**Scripts** get relaxed rules in `scripts/**/*.ts` (CLI tooling, build scripts), including allowing `throw`.

Run `npm test` to check the rules against the fixtures in `test/fixtures/project`.

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
		env: { DATABASE_URL: 'postgres://localhost/test' }
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

| Peer                          | Used by                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `eslint-config-next`          | `createConfig({ framework: 'nextjs' })`                     |
| `prettier-plugin-svelte`      | `prettier/svelte`                                           |
| `prettier-plugin-tailwindcss` | `prettier/svelte`, `prettier/nextjs`                        |
| `vitest`                      | `vitest/nextjs`                                             |
| `@vitest/eslint-plugin`       | Vitest rules in `createConfig()`                            |
| `eslint-plugin-svelte`        | `createConfig({ framework: 'svelte' })`                     |
| `neverthrow`                  | `@davidteju/must-use-result` (projects that return Results) |

## License

MIT
