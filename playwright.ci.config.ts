import { defineConfig } from '@playwright/test'

export default defineConfig({
	use: {
		trace: 'on',
	},
	testDir: 'e2e',
	timeout: 120 * 1000,
	workers: 1,
})
