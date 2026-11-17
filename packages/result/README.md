# @davidteju/result

The runtime half of [`@davidteju/dev-config`](../../README.md)'s rules, kept in the same repository.
Its lint bans `throw` and type casts; this package is what code uses instead, so no project
writes its own `panic.ts` and `unchecked.ts`.

It is a runtime dependency, not a devDependency: a Docker image that prunes devDependencies
keeps it.

It installs from a GitHub release, because npm cannot install a package from a folder of a
repository:

```bash
npm install https://github.com/DavidTeju/dev-config/releases/download/result-v0.1.1/davidteju-result-0.1.1.tgz neverthrow
```

The tarball holds the built JavaScript and types, so installing runs no build.

## What's in it

**`@davidteju/result`**

| Export                                                                                                      | For                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panic(message, cause?)`                                                                                    | A bug or a broken invariant. The one `throw`, like Rust's `panic!`.                                                                                                                     |
| `unchecked<T>(value, reason)`                                                                               | A type claim no check can make. The one cast; `reason` says why. Prefer a guard or a zod schema.                                                                                        |
| `Failure`, `NotFound`, `Conflict`, `Invalid`, `Forbidden`, `Unsupported`, `TooLarge`, `Malformed`           | Error values: plain objects tagged by `kind`, so the compiler tells them apart. A module returns its own narrow union of them; each exit (an HTTP handler, a CLI) translates them once. |
| `failure`, `failed`, `notFound`, `conflict`, `invalid`, `forbidden`, `unsupported`, `tooLarge`, `malformed` | Their builders. `failed(cause, context)` keeps what was thrown.                                                                                                                         |
| `attempt(doing, work)` / `attemptSync`                                                                      | A call that may reject or throw, as a `Result` whose error says "`doing` failed: why".                                                                                                  |
| `ifThere` / `missingAs` (and `…Async`)                                                                      | A read where a missing file (`ENOENT`) is an answer, not a failure.                                                                                                                     |
| `ensuring(work, cleanup)`                                                                                   | `finally` for Results: cleanup runs however the work ended.                                                                                                                             |
| `parseJson(text, where)`                                                                                    | `JSON.parse` as a `Result`.                                                                                                                                                             |
| `isRecord`, `hasKey`, `isKeyOf`, `keysOf`, `stringOr`, `numberOr`, `isUuid`, `errorCode`, `exitStatus`      | Guards that narrow instead of casting.                                                                                                                                                  |
| `errorMessage`, `toError`                                                                                   | A thrown value as text, or as an `Error`.                                                                                                                                               |

**`@davidteju/result/zod`** (needs `zod` 4): `checked(schema, value, where)` reads a value as a
schema into a `Result<T, Malformed>`; `maybe` and `nullable` read absent and `null` fields as
`undefined`; `jsonText(schema)` reads a text field that holds JSON.

**`@davidteju/result/testing`**, in tests only: `value`, `errorOf`, `failureOf` (and `…Async`)
unwrap a Result a test expects and fail the test showing what came instead; `nth(list, i)` reads
an item a test needs.

None of it imports Node, so all of it runs in the browser too.

## Developing

From the repository root, `npm test` runs dev-config's tests and then this package's
`verify`: type check, lint with the repository's own ESLint config, and tests.

To release a version: bump `version` here, commit, then from the root

```bash
npm pack --workspace @davidteju/result
gh release create result-v<version> davidteju-result-<version>.tgz --title "@davidteju/result <version>"
```

`npm pack` builds `dist/` first (`prepack`). The `result-` prefix keeps these tags apart from
dev-config's own `v<version>` tags.
