# @davidteju/dev-config

Shared ESLint, Oxfmt, TypeScript, Vitest, and lint-staged configs for my projects.

Install from GitHub:

```bash
npm install --save-dev github:DavidTeju/dev-config
```

This repository also holds [`@davidteju/result`](packages/result/README.md), the runtime helpers
the lint rules point at (`panic`, `unchecked`, tagged errors). It installs from a GitHub release,
not with the command above.

## What's included

| Export path              | Description                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `./eslint`               | `createConfig()`: the whole ESLint flat config, for Node, SvelteKit or Next.js                      |
| `./oxfmt/base`           | Base Oxfmt config (tabs, single quotes, width 100)                                                  |
| `./oxfmt/svelte`         | Oxfmt config with Svelte and Tailwind formatting                                                    |
| `./oxfmt/nextjs`         | Oxfmt config with Tailwind formatting                                                               |
| `./tsconfig/node`        | TypeScript config for plain Node/backend services (NodeNext, ESM, strict)                           |
| `./tsconfig/node-native` | `node` preset for TypeScript that Node runs directly with type stripping (no build step)            |
| `./tsconfig/svelte`      | TypeScript config for SvelteKit                                                                     |
| `./tsconfig/nextjs`      | TypeScript config for Next.js                                                                       |
| `./vitest/node`          | Vitest config factory for plain Node/TS services (node env, 5 s `expect.poll`, `@` alias)           |
| `./vitest/nextjs`        | Vitest config factory for Next.js (jsdom + React, 5 s `expect.poll`, `@` alias)                     |
| `./vitest/poll-floor`    | `POLL_TIMEOUT_FLOOR_MS`, for a project with its own Vitest config to set `test.expect.poll.timeout` |
| `./lint-staged/node`     | lint-staged config for Node/TS services                                                             |
| `./lint-staged/svelte`   | lint-staged config for SvelteKit                                                                    |
| `./lint-staged/nextjs`   | lint-staged config for Next.js                                                                      |

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
// oxfmt.config.ts
export { default } from '@davidteju/dev-config/oxfmt/base';
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

- Formatting runs separately through Oxfmt. `eslint-config-prettier` only disables conflicting layout rules; it does not run Prettier.
- **Blank lines the formatter will not add** (`@stylistic/padding-line-between-statements`, autofixable): one after each `if` (except between consecutive `if`s), one before each `return`, and separation around function, class, interface, type, and export declarations. `@stylistic/lines-between-class-members` separates constructors and methods from adjacent members. Related fields and class-method overload signatures stay together. The Svelte preset applies the same statement options inside module and instance scripts through `@davidteju/svelte-script-padding`
- TypeScript strictness: no `any`, consistent type imports, no non-null assertions
- **No type casts** (`consistent-type-assertions: never`; `as const` is allowed). Narrow with a real check instead: `typeof`, `instanceof`, a type guard, or a zod schema for data from outside.
- **No `throw`** (`@davidteju/no-throw`). Return a [neverthrow](https://github.com/supermacro/neverthrow) `Result` for a failure the caller can act on; call `panic()` for a bug.
- **`@davidteju/must-use-result`** reports a neverthrow `Result` that is computed and dropped, like Rust's `#[must_use]`. `void result` discards one on purpose; an unawaited `ResultAsync` is reported by `no-floating-promises`. It does nothing in a project that does not load neverthrow.
- **`@davidteju/no-ignored-error`** reports an error that is caught and dropped: a `catch {}`, `.catch(() => …)` or `.then(…, () => …)` handler that never reads its error and, with type information, the same in neverthrow's `orElse`, `match`, `mapErr`, `orTee` and the error mappers of `fromPromise`/`fromThrowable`. It bans `unwrapOr` on a `Result` unless `.orTee(report)` comes right before it, so every fallback reports the error it replaces: `result.orTee(report).unwrapOr(fallback)`. A `_`-prefixed parameter counts as unread. When a failure is an expected answer (a missing file, a line that is not JSON), return it as a value instead of an error.
- Both rules need type information, which is on by default (`typeChecked: true`). With `typeChecked: false` the throw ban is off too, because a dropped Result could not be caught.
- **Escape hatches, one file each**, so every use is greppable: a file named `unchecked.ts` may cast, and a file named `panic.ts` may throw. [`@davidteju/result`](packages/result/README.md) ships both, with tagged error values and the neverthrow helpers that make the bans livable.
- Code quality: complexity cap (15), no nested ternaries, no param reassignment
- Security: no `eval` / `implied-eval`

**Test files** get relaxed rules (`**/*.{test,spec}.{ts,tsx}`, `**/__tests__/**`, `**/benchmark/**`):

- Allows `any`, type casts, `throw`, non-null assertions, `console`, and raw `Date` usage

**Test helpers**, any other file in a `test/`, `tests/` or `e2e/` folder at the project root or a `test/` or `tests/` folder in `src/` (fakes, fixtures, support code), may cast and `throw`. Everything else stays as in product code, including `must-use-result`: a helper that drops a Result hides a failure in every test that calls it. A folder deeper in `src` named `test`, such as a route, is product code.

**Tests wait on conditions, not the clock** (this package's own rules, on in test files):

- `@davidteju/no-fixed-sleep`: no `new Promise((r) => setTimeout(r, ms))`, `sleep`/`wait`/`pause`/`delay(ms)` helpers, `setTimeout(ms)` from `node:timers/promises`, `scheduler.wait(ms)` or Playwright's `waitForTimeout`. A zero delay (one turn of the event loop) and a watchdog that resolves with a value are allowed.
- `@davidteju/poll-timeout-floor`: `expect.poll` and `vi.waitFor` get at least 5 s (`POLL_TIMEOUT_FLOOR_MS` in `vitest/poll-floor.mjs`). The shared Vitest configs make 5 s `expect.poll`'s default; a project with its own Vitest config (a SvelteKit app, say) sets `test.expect: { poll: { timeout: POLL_TIMEOUT_FLOOR_MS } }` from `./vitest/poll-floor`. A bare `vi.waitFor` or `vi.waitUntil`, which Vitest leaves at 1 s, is reported and `--fix` adds `{ timeout: 5000 }`.
- `@davidteju/no-elapsed-time-assertion`: no asserting on `Date.now() - started` or `performance.now()` deltas. A timestamp in the past (`Date.now() - HOUR_MS`) is fine.
- `@davidteju/no-exact-timer-count`: no `expect(vi.getTimerCount()).toBe(n)` for n other than 0.

Each message names the fix: fake timers (`vi.useFakeTimers()`, then `await vi.advanceTimersByTimeAsync(ms)`) for time the code measures, or waiting on the condition the test asserts.

**Vitest rules** for test files, when `@vitest/eslint-plugin` is installed:

- `vitest/no-conditional-in-test`: bans `if` statements inside test bodies
- `vitest/no-conditional-expect`: bans conditional `expect()` calls

**Scripts** get relaxed rules in `scripts/**/*.ts` (CLI tooling, build scripts), including allowing `throw`.

Run `npm test` to check the rules against the fixtures in `test/fixtures/project`.

## Oxfmt

Install `oxfmt@0.79.0` and select a shared preset in `oxfmt.config.ts`:

```js
// Plain Node: use /base. SvelteKit: /svelte. Next.js: /nextjs.
export { default } from '@davidteju/dev-config/oxfmt/svelte';
```

All presets use tabs, single quotes and a 100-character print width. Import and
package.json sorting are disabled. Svelte and Next.js enable Tailwind class sorting;
Svelte also enables component formatting and uses no trailing commas. Svelte formatting
requires the consuming project's `svelte` package (including `svelte/compiler`).

Use `oxfmt --check .` in lint/CI and `oxfmt --write .` to format. Keep ESLint as a
separate lint step: it enforces type-aware rules, Svelte template rules and blank lines.
The shared lint-staged presets run both where appropriate.

To migrate, replace the Prettier preset import and scripts, remove `prettier`,
`prettier-plugin-svelte` and `prettier-plugin-tailwindcss`, and move `.prettierignore`
entries into `ignorePatterns` in the new config. Delete the old formatter config and
ignore file. Oxfmt respects `.gitignore` and skips generated lockfiles; they are not
part of the formatting check. Run `oxfmt --write .` once and review the formatting diff.

Compose project-specific exclusions without copying shared formatting defaults:

```js
import base from '@davidteju/dev-config/oxfmt/base';

export default { ...base, ignorePatterns: ['generated'] };
```

## TypeScript

Every preset is `strict` plus `noUncheckedIndexedAccess` (an indexed read may be `undefined`) and `exactOptionalPropertyTypes` (an optional property is left out, never set to `undefined`; write `label?: string | undefined` where `undefined` is a value the field really takes).

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

Required: `eslint`, `oxfmt@0.79.0`, `typescript`

Optional (install only what your framework needs):

| Peer                    | Used by                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `eslint-config-next`    | `createConfig({ framework: 'nextjs' })`                     |
| `vitest`                | `vitest/nextjs`                                             |
| `@vitest/eslint-plugin` | Vitest rules in `createConfig()`                            |
| `eslint-plugin-svelte`  | `createConfig({ framework: 'svelte' })`                     |
| `neverthrow`            | `@davidteju/must-use-result` (projects that return Results) |

## License

MIT
