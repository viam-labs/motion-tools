import { test as base, expect, type Page } from '@playwright/test'
import {
	createViamClient,
	type JsonValue,
	Struct,
	type ViamClient,
	type ViamClientOptions,
} from '@viamrobotics/sdk'

import { screenshotCanvas } from '../helpers/screenshot'

const getE2EConfig = () => {
	const host = process.env.VIAM_E2E_HOST
	const partId = process.env.VIAM_E2E_PART_ID
	const machineName = process.env.VIAM_E2E_MACHINE_NAME
	const robotId = process.env.VIAM_E2E_ROBOT_ID
	const apiKeyId = process.env.VIAM_E2E_API_KEY_ID
	const apiKey = process.env.VIAM_E2E_API_KEY
	const orgId = process.env.VIAM_E2E_ORG_ID
	const signalingAddress = process.env.VIAM_E2E_SIGNALING_ADDRESS ?? 'https://app.viam.com:443'

	if (!host || !partId || !machineName || !robotId || !apiKeyId || !apiKey || !orgId) {
		throw new Error(
			'Missing E2E environment variables. The global setup may not have run.\n' +
				'Make sure playwright.config.ts has globalSetup configured.'
		)
	}

	return {
		host,
		partId,
		machineName,
		robotId,
		apiKeyId,
		apiKey,
		orgId,
		signalingAddress,
	}
}

export type E2ETestConfig = ReturnType<typeof getE2EConfig>

export interface RobotTestPage {
	page: Page
	config: E2ETestConfig
	viamClient: ViamClient
	failedScreenshots: string[]
	takeScreenshot: (testPrefix: string) => Promise<void>
	screenshotCanvas: (testPrefix: string) => Promise<void>
	assertScreenshots: () => void
}

export const injectMachineConfig = async (page: Page, config: E2ETestConfig) => {
	await page.evaluate(
		(cfg) =>
			new Promise<void>((resolve, reject) => {
				const connectionConfig = {
					host: cfg.host,
					partId: cfg.partId,
					apiKeyId: cfg.apiKeyId,
					apiKeyValue: cfg.apiKey,
					signalingAddress: cfg.signalingAddress,
				}

				const request = indexedDB.open('keyval-store')
				request.onerror = () => reject(request.error)
				request.onupgradeneeded = () => {
					request.result.createObjectStore('keyval')
				}
				request.onsuccess = () => {
					const db = request.result
					const tx = db.transaction('keyval', 'readwrite')
					tx.objectStore('keyval').put([connectionConfig], 'connection-configs')
					tx.oncomplete = () => {
						db.close()
						resolve()
					}
					tx.onerror = () => {
						db.close()
						reject(tx.error)
					}
				}

				// Leave the active config unset (-1). The fixture activates the
				// injected entry by host after reload, because the merged-list index
				// depends on how many env configs the running dev server is serving —
				// which the test can't know reliably (e.g. when `.env.local` defines
				// VITE_CONFIGS and reuseExistingServer reuses that dev server).
				localStorage.setItem('active-connection-config', '-1')
			}),
		config
	)
}

export const activateConnectionConfigByHost = async (page: Page, host: string) => {
	const configButton = page.getByRole('button', { name: 'Machine connection configs' })
	await configButton.click()

	await expect(async () => {
		const rows = page.locator('form').filter({
			has: page.locator('input[placeholder="Remote address"]'),
		})
		const count = await rows.count()
		for (let index = 0; index < count; index += 1) {
			const row = rows.nth(index)
			if ((await row.locator('input[placeholder="Remote address"]').inputValue()) === host) {
				const switchButton = row.getByRole('switch')
				if ((await switchButton.getAttribute('aria-checked')) !== 'true') {
					await switchButton.click()
				}
				return
			}
		}
		throw new Error(`Connection config row for host "${host}" not found`)
	}).toPass({ timeout: 10_000 })

	await configButton.click()
}

export const connectViamClient = async (): Promise<ViamClient> => {
	const config = getE2EConfig()
	const opts: ViamClientOptions = {
		serviceHost: config.signalingAddress,
		credentials: {
			type: 'api-key',
			authEntity: config.apiKeyId,
			payload: config.apiKey,
		},
	}
	return createViamClient(opts)
}

interface ApplyMachineConfigOptions {
	settleMs?: number
}

export const applyMachineConfig = async (
	client: ViamClient,
	partId: string,
	machineName: string,
	config: Record<string, unknown>,
	options: ApplyMachineConfigOptions = {}
): Promise<void> => {
	const { settleMs = 5000 } = options

	await client.appClient.updateRobotPart(
		partId,
		machineName,
		Struct.fromJson(config as unknown as JsonValue)
	)

	await new Promise((resolve) => setTimeout(resolve, settleMs))
}

export const connectOrgViamClient = async (): Promise<ViamClient> => {
	const orgApiKeyId = process.env.VIAM_E2E_ORG_API_KEY_ID
	const orgApiKey = process.env.VIAM_E2E_ORG_API_KEY
	const signalingAddress = process.env.VIAM_E2E_SIGNALING_ADDRESS ?? 'https://app.viam.com:443'

	if (!orgApiKeyId || !orgApiKey) {
		throw new Error(
			'Missing VIAM_E2E_ORG_API_KEY_ID / VIAM_E2E_ORG_API_KEY env vars.\n' +
				'These are required for org-level operations like fragment management.'
		)
	}

	const opts: ViamClientOptions = {
		serviceHost: signalingAddress,
		credentials: {
			type: 'api-key',
			authEntity: orgApiKeyId,
			payload: orgApiKey,
		},
	}
	return createViamClient(opts)
}

export const withRobot = base.extend<{ robotPage: RobotTestPage }>({
	robotPage: async ({ browser }, use) => {
		const config = getE2EConfig()
		const context = await browser.newContext()
		const page = await context.newPage()
		const failedScreenshots: string[] = []

		page.on('console', (message) => {
			console.log(`[${message.type()}] ${message.text()}`)
		})

		// Navigate first to establish the origin, then inject config.
		// goto('') (not '/') so a baseURL with a path — e.g. the hosted
		// playground — resolves correctly instead of jumping to host root.
		await page.goto('')
		await injectMachineConfig(page, config)
		await page.reload()
		await activateConnectionConfigByHost(page, config.host)

		const machineConfigButton = page.getByRole('button', { name: 'Machine connection configs' })

		const maxRetries = 5
		let connected = false
		for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
			try {
				await expect(machineConfigButton.getByText('live', { exact: true })).toBeVisible({
					timeout: 15_000,
				})
				connected = true
				break
			} catch {
				if (attempt < maxRetries) {
					console.log(
						`Connection attempt ${attempt} failed, retrying (${attempt}/${maxRetries})...`
					)
					await page.reload()
					await page.waitForTimeout(2000)
				}
			}
		}

		if (!connected) {
			throw new Error(`Machine failed to show "live" status after ${maxRetries} attempts.`)
		}

		const client = await connectViamClient()

		const takeScreenshot = async (testPrefix: string) => {
			try {
				await expect(page).toHaveScreenshot(`${testPrefix}.png`, {
					fullPage: true,
					threshold: 0.1,
				})
			} catch (error) {
				console.warn(error)
				failedScreenshots.push(`${testPrefix}.png`)
			}
		}

		const takeCanvasScreenshot = async (testPrefix: string) => {
			const failure = await screenshotCanvas(page, testPrefix)
			if (failure) {
				failedScreenshots.push(failure)
			}
		}

		const assertScreenshots = () => {
			if (failedScreenshots.length > 0) {
				console.log(`Failed screenshots: ${failedScreenshots.join(', ')}`)
				throw new Error(`Failed screenshots: ${failedScreenshots.join(', ')}`)
			}
		}

		await use({
			page,
			config,
			viamClient: client,
			failedScreenshots,
			takeScreenshot,
			screenshotCanvas: takeCanvasScreenshot,
			assertScreenshots,
		})

		await context.close()
	},
})

export { getE2EConfig }
