import { defineConfig } from '@playwright/test'
import path from 'node:path'
import url from 'node:url'

const dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default defineConfig({
	globalSetup: path.resolve(dirname, './e2e/helpers/global-setup.ts'),
	webServer: {
		command: 'pnpm dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
		env: {
			VITE_CONFIGS: '{}',
		},
	},
	use: {
		trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
	},
	testDir: 'e2e',
	outputDir: 'test-results',
	timeout: 120 * 1000,
	workers: 1,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI
		? [['list'], ['html', { open: 'never' }], ['github']]
		: [['list'], ['html', { open: 'never' }]],
	// Pinned because the built-in template injects {-projectName} into every
	// filename, so naming projects would orphan all committed baselines.
	snapshotPathTemplate:
		'{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{platform}{ext}',
	expect: {
		timeout: 10_000,
		toHaveScreenshot: {
			threshold: 0.1,
			animations: 'disabled',
			caret: 'hide',
		},
	},
})
