import base from '@davidteju/dev-config/oxfmt/base';
import svelte from '@davidteju/dev-config/oxfmt/svelte';
import nextjs from '@davidteju/dev-config/oxfmt/nextjs';
import { defineConfig } from 'oxfmt';

export default defineConfig({ ...base, ...svelte, ...nextjs, ignorePatterns: ['generated'] });
