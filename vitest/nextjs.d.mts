import type { UserConfig } from 'vitest/config';

export function createVitestConfig(options: {
	rootDir: string;
	setupFiles?: string[];
	env?: Record<string, string>;
}): UserConfig;
