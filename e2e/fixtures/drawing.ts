import { test as base, expect } from '@playwright/test'
import { type ChildProcess, exec, execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'
import { promisify } from 'node:util'

import { createDrawClient, type DrawClient, resetScene } from '../helpers/drawClient'
import { screenshotCanvas } from '../helpers/screenshot'

const execAsync = promisify(exec)

const dirname = path.dirname(url.fileURLToPath(import.meta.url))

const API_PACKAGE = 'github.com/viamrobotics/visualization/client/api'

/** Avoids 3000, 3030, 5173, 9090, and the 191xx range Go's own test servers use. */
const BASE_PORT = 4100

const CONNECT_PROBE_TIMEOUT_MS = 500

const isListening = (port: number): Promise<boolean> =>
	new Promise((resolve) => {
		const socket = net.connect({ port, host: '127.0.0.1' })
		const settle = (listening: boolean) => {
			socket.destroy()
			resolve(listening)
		}
		socket.once('connect', () => settle(true))
		socket.once('error', () => settle(false))
		socket.setTimeout(CONNECT_PROBE_TIMEOUT_MS, () => settle(false))
	})

const waitForListening = async (port: number, timeoutMs = 15_000): Promise<void> => {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		if (await isListening(port)) return
		await new Promise((resolve) => {
			setTimeout(resolve, 50)
		})
	}
	throw new Error(`draw server never started listening on ${port}`)
}

/**
 * A relative URL, so a baseURL carrying a path resolves against it instead of
 * jumping to the host root. `drawPort` points the app at this worker's server.
 */
const sceneUrl = (port: number, routePath = ''): string =>
	`${routePath ? `/${routePath}` : ''}?drawPort=${port}`

const goTestCommand = (pattern: string, timeoutSeconds?: number): string => {
	const timeout = timeoutSeconds === undefined ? '' : ` -timeout=${timeoutSeconds}s`
	return `go test -run ${pattern} ${API_PACKAGE} -count=1${timeout}`
}

export type DroppedFile = string | { name: string; content: string }

interface GoTestOptions {
	/** Passed to `go test -timeout`. Go's own default is 10 minutes. */
	timeoutSeconds?: number
}

export type GoTest = (pattern: string, options?: GoTestOptions) => string

export type GoTestAsync = (pattern: string, options?: GoTestOptions) => Promise<unknown>

interface DrawServer {
	port: number
}

interface DrawingFixtures {
	drawClient: DrawClient
	dropFile: (file: DroppedFile) => Promise<void>
	goTest: GoTest
	goTestAsync: GoTestAsync
	gotoScene: (routePath: string) => Promise<void>
	resetScene: () => Promise<void>
	snapshotAndReset: (testPrefix: string) => Promise<void>
	takeScreenshot: (testPrefix: string) => Promise<void>
}

interface DrawingWorkerFixtures {
	drawServer: DrawServer
}

/**
 * Drives the scene against a draw server this worker owns, so the drawing specs
 * can run in parallel without seeing each other's entities.
 */
export const test = base.extend<DrawingFixtures, DrawingWorkerFixtures>({
	drawServer: [
		// Playwright requires the destructuring pattern here, empty or not.
		// eslint-disable-next-line no-empty-pattern
		async ({}, use, workerInfo) => {
			// parallelIndex, not workerIndex: a worker that crashes and restarts gets a
			// fresh workerIndex, which would move its server to a port the old process
			// might still hold.
			const port = BASE_PORT + workerInfo.parallelIndex

			// server.Start attaches to an existing listener rather than failing, so a
			// stale process here would be silently shared instead of reported.
			if (await isListening(port)) {
				throw new Error(
					`port ${port} is already in use, so worker ${workerInfo.parallelIndex} ` +
						`cannot own a draw server. Kill whatever is listening and re-run.`
				)
			}

			const binary = path.resolve(dirname, '../../.bin/draw-server')
			if (!fs.existsSync(binary)) {
				throw new Error(`draw-server binary not found at ${binary}. Run 'pnpm go-build'.`)
			}

			// Its own temp dir per worker. NewDrawService empties the directory it is
			// given at startup, and workers start at different times, so a shared one
			// would delete another worker's in-flight chunk buffers.
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `draw-server-${port}-`))
			const logPath = path.join(tempDir, 'draw-server.log')
			const logFd = fs.openSync(logPath, 'w')

			const server: ChildProcess = spawn(
				binary,
				['-port', String(port), '-tmp-dir', path.join(tempDir, 'chunks')],
				{ stdio: ['ignore', logFd, logFd] }
			)
			fs.closeSync(logFd)

			const exited = new Promise<void>((resolve) => {
				server.once('exit', () => resolve())
			})

			try {
				await waitForListening(port)
			} catch (error) {
				const log = fs.readFileSync(logPath, 'utf8')
				throw new Error(`${(error as Error).message}. Log: ${log}`, { cause: error })
			}

			await use({ port })

			server.kill('SIGTERM')
			await exited
			fs.rmSync(tempDir, { recursive: true, force: true })
		},
		{ scope: 'worker' },
	],

	page: async ({ page, drawServer }, use) => {
		if (process.env.E2E_DEBUG) {
			page.on('console', (message) => {
				console.log(`[${message.type()}] ${message.text()}`)
			})
		}

		await page.goto(sceneUrl(drawServer.port))
		await expect(page.getByRole('heading', { name: 'World', exact: true })).toBeVisible({
			timeout: 15_000,
		})

		await use(page)
	},

	gotoScene: async ({ page, drawServer }, use) => {
		await use(async (routePath: string) => {
			await page.goto(sceneUrl(drawServer.port, routePath))
			await page.waitForLoadState('load')
		})
	},

	drawClient: async ({ drawServer }, use) => {
		await use(createDrawClient(drawServer.port))
	},

	goTest: async ({ drawServer }, use) => {
		await use((pattern, { timeoutSeconds }: GoTestOptions = {}) =>
			execSync(goTestCommand(pattern, timeoutSeconds), {
				encoding: 'utf8',
				env: { ...process.env, DRAW_SERVICE_PORT: String(drawServer.port) },
			})
		)
	},

	goTestAsync: async ({ drawServer }, use) => {
		await use((pattern, { timeoutSeconds }: GoTestOptions = {}) =>
			execAsync(goTestCommand(pattern, timeoutSeconds), {
				env: { ...process.env, DRAW_SERVICE_PORT: String(drawServer.port) },
			})
		)
	},

	resetScene: async ({ page, drawClient }, use) => {
		await use(() => resetScene(drawClient, page))
	},

	snapshotAndReset: async ({ page, drawClient }, use) => {
		await use(async (testPrefix: string) => {
			await screenshotCanvas(page, testPrefix)
			await resetScene(drawClient, page)
		})
	},

	takeScreenshot: async ({ page }, use) => {
		await use((testPrefix: string) =>
			expect.soft(page).toHaveScreenshot(`${testPrefix}.png`, { fullPage: true })
		)
	},

	dropFile: async ({ page }, use) => {
		await use(async (file: DroppedFile) => {
			const isPath = typeof file === 'string'
			const base64Data = isPath
				? fs.readFileSync(file).toString('base64')
				: Buffer.from(file.content).toString('base64')
			const fileName = isPath ? (file.split('/').pop() ?? file) : file.name

			await page.evaluate(
				({ base64Data, fileName }) => {
					const binaryString = atob(base64Data)
					const bytes = new Uint8Array(binaryString.length)
					for (let i = 0; i < binaryString.length; i++) {
						bytes[i] = binaryString.charCodeAt(i)
					}

					const dropped = new File([bytes], fileName, { type: 'application/octet-stream' })
					const dataTransfer = new DataTransfer()
					dataTransfer.items.add(dropped)

					globalThis.dispatchEvent(
						new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer })
					)

					const dropZone = document.querySelector('[aria-label="File drop zone"]')
					if (!dropZone) {
						throw new Error('Drop zone not found')
					}

					dropZone.dispatchEvent(
						new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer })
					)
				},
				{ base64Data, fileName }
			)
		})
	},
})

export { expect, type Page } from '@playwright/test'
