import { defineConfig } from '@playwright/test'
import path from 'node:path'
import url from 'node:url'

const dirname = path.dirname(url.fileURLToPath(import.meta.url))

const baseURL = process.env.BASE_URL

export default defineConfig({
	globalSetup: path.resolve(dirname, './e2e/helpers/global-setup.ts'),
	webServer: baseURL
		? undefined
		: {
				command: 'pnpm dev',
				port: 5173,
				reuseExistingServer: true,
				env: {
					VITE_CONFIGS: '{}',
				},
			},
	use: {
		baseURL,
		trace: 'on',
	},
	testDir: 'e2e',
	timeout: 120 * 1000,
	workers: 1,
})
