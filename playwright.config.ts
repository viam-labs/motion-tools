import { defineConfig } from '@playwright/test'

const DRAWING_SPECS = [
	/draw-client\.test\.ts$/,
	/file-drop\.test\.ts$/,
	/snapshot\.test\.ts$/,
] as const

const ROBOT_SPECS = [
	/arm\.test\.ts$/,
	/edit-frame\.test\.ts$/,
	/obstacle-store\.test\.ts$/,
	/world-state-store\.test\.ts$/,
] as const

export default defineConfig({
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
		toHaveScreenshot: { threshold: 0.1, animations: 'disabled', caret: 'hide' },
	},
	projects: [
		{
			name: 'drawing',
			testMatch: [...DRAWING_SPECS],
		},
		{
			// Provisioning is its own project so a drawing-only run never pays for a
			// cloud machine. The robot project's dependency is what pulls it in.
			name: 'robot-setup',
			testMatch: /robot\.setup\.ts$/,
			teardown: 'robot-teardown',
			timeout: 5 * 60 * 1000,
		},
		{
			name: 'robot-teardown',
			testMatch: /robot\.teardown\.ts$/,
			timeout: 2 * 60 * 1000,
		},
		{
			// All four specs push conflicting configs at the one shared machine, so they
			// stay serial even once the drawing project goes parallel.
			name: 'robot',
			testMatch: [...ROBOT_SPECS],
			dependencies: ['robot-setup'],
			fullyParallel: false,
		},
	],
})
