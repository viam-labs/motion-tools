import path from 'node:path'

import { baseSvelteConfig, createConfig } from '@viamrobotics/eslint-config-svelte'

export default createConfig(
	baseSvelteConfig,
	{
		name: 'viam/ui/ignores',
		ignores: ['.svelte-kit', 'build', 'static/fonts', 'vite.config.ts.timestamp*'],
	},
	{
		name: 'viam/ui/base',
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},
		settings: {
			tailwindcss: {
				config: path.join(import.meta.dirname, 'tailwind.config.ts'),
			},
		},
		rules: {
			// This is a browser app, window is more specific than globalThis
			'unicorn/prefer-global-this': 'off',

			// Allow array callback references for performance and type-safety
			'unicorn/no-array-callback-reference': 'off',

			// Redundant with svelte-check
			'svelte/no-unused-svelte-ignore': 'off',
		},
	}
)
