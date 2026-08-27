import { defineConfig } from '@playwright/test'

import base from './playwright.config'

/** Runs against the deployed gh-pages playground, so there is no local webServer to start. */
export default defineConfig({
	...base,
	webServer: undefined,
	use: {
		...base.use,
		baseURL: 'https://viamrobotics.github.io/visualization/playground/',
	},
})
