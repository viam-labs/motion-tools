import { defineConfig } from '@playwright/test'

const DRAWING_SPECS = [
	/draw-client\.test\.ts$/,
	/file-drop\.test\.ts$/,
	/snapshot\.test\.ts$/,
] as const

const MATRIX_SPECS = [/matrix\/.*\.test\.ts$/] as const

const ROBOT_SPECS = [
	/arm\.test\.ts$/,
	/edit-frame\.test\.ts$/,
	/obstacle-store\.test\.ts$/,
	/world-state-store\.test\.ts$/,
] as const

const DEV_SERVER_PORT = 5173

export default defineConfig({
	webServer: {
		command: 'pnpm dev',
		port: DEV_SERVER_PORT,
		reuseExistingServer: !process.env.CI,
		env: {
			VITE_CONFIGS: '{}',
		},
	},
	use: {
		// Stated rather than left to `webServer.port`, which Playwright only
		// resolves into the context it creates per test. The matrix project builds
		// its own worker-scoped context and reads the base URL off the project.
		baseURL: `http://localhost:${DEV_SERVER_PORT}`,
		trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
	},
	testDir: 'e2e',
	outputDir: 'test-results',
	timeout: 120 * 1000,
	// Measured on an 8-core darwin box: 4 workers cut the drawing project from 451s
	// to 377s but stretched the mean test from 6.4s to 15.6s, which is what pushed
	// one snapshot test past its timeout. 2 keeps most of the gain with less
	// contention. CI runners have 4 vCPUs.
	workers: process.env.CI ? 4 : 2,
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
			// Each worker owns a draw server, so these specs share no scene state.
			name: 'drawing',
			testMatch: [...DRAWING_SPECS],
			fullyParallel: true,
		},
		{
			// Cells are one or two RPCs and a poll against a page the whole worker
			// shares, so this project parallelizes on RPC latency rather than on
			// page loads the way `drawing` does.
			name: 'matrix',
			testMatch: [...MATRIX_SPECS],
			fullyParallel: true,
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
