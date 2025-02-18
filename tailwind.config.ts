import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'
import { skeleton, contentPath } from '@skeletonlabs/skeleton/plugin'
import * as themes from '@skeletonlabs/skeleton/themes'

export default {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}', contentPath(import.meta.url, 'svelte')],
	theme: {
		extend: {},
	},
	plugins: [
		forms,
		skeleton({
			themes: [themes.vintage],
		}),
	],
} satisfies Config
