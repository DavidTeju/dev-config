/**
 * Claims a type without checking it, like a Rust `unsafe` block. This file is the only production
 * code allowed to cast, so every unchecked claim is a greppable call to `unchecked()` whose
 * reason says why no check is possible. Prefer a type guard or a zod schema.
 */
export const unchecked = <T>(value: unknown, _reason: string): T => value as T;
