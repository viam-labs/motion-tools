import { type Browser, expect, type Page } from '@playwright/test'
import { createViamClient, type ViamClient, type ViamClientOptions } from '@viamrobotics/sdk'
import fs from 'node:fs'

import { openScene } from './helpers/openScene'
import { screenshotCanvas } from './helpers/screenshot'

const getTestConfig = () => ({
	host: process.env.VIAM_E2E_HOST ?? '',
	name: process.env.VIAM_E2E_MACHINE_NAME ?? '',
	partId: process.env.VIAM_E2E_PART_ID ?? '',
	apiKeyId: process.env.VIAM_E2E_API_KEY_ID ?? '',
	apiKeyValue: process.env.VIAM_E2E_API_KEY ?? '',
	signalingAddress: process.env.VIAM_E2E_SIGNALING_ADDRESS ?? 'https://app.viam.com:443',
	organizationId: process.env.VIAM_E2E_ORG_ID ?? '',
})

type TestConfig = ReturnType<typeof getTestConfig>

interface TestPage {
	page: Page
	testConfig: TestConfig
	refresh: () => Promise<void>
	takeScreenshot: (testPrefix: string) => Promise<void>
	screenshotCanvas: (testPrefix: string) => Promise<void>
	dropFile: (file: string | { name: string; content: string }) => Promise<void>
	connect: () => Promise<ViamClient>
}

export const createPage = async (browser: Browser): Promise<TestPage> => {
	const testConfig = getTestConfig()
	const page = await openScene(browser)

	const refresh = async () => {
		await page.reload()
		await expect(page.getByRole('heading', { name: 'World', exact: true })).toBeVisible({
			timeout: 15000,
		})
	}

	const takeScreenshot = async (testPrefix: string) => {
		await expect.soft(page).toHaveScreenshot(`${testPrefix}.png`, { fullPage: true })
	}

	const takeCanvasScreenshot = (testPrefix: string) => screenshotCanvas(page, testPrefix)

	const dropFile = async (file: string | { name: string; content: string }) => {
		let base64Data: string
		let fileName: string

		if (typeof file === 'string') {
			const fileBuffer = fs.readFileSync(file)
			base64Data = fileBuffer.toString('base64')
			fileName = file.split('/').pop() ?? file
		} else {
			base64Data = Buffer.from(file.content).toString('base64')
			fileName = file.name
		}

		await page.evaluate(
			({ base64Data, fileName }) => {
				const binaryString = atob(base64Data)
				const bytes = new Uint8Array(binaryString.length)
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i)
				}

				const file = new File([bytes], fileName, { type: 'application/octet-stream' })
				const dataTransfer = new DataTransfer()
				dataTransfer.items.add(file)

				globalThis.dispatchEvent(
					new DragEvent('dragenter', {
						bubbles: true,
						cancelable: true,
						dataTransfer,
					})
				)

				const dropZone = document.querySelector('[aria-label="File drop zone"]')
				if (!dropZone) {
					throw new Error('Drop zone not found')
				}

				dropZone.dispatchEvent(
					new DragEvent('drop', {
						bubbles: true,
						cancelable: true,
						dataTransfer,
					})
				)
			},
			{ base64Data, fileName }
		)
	}

	const connect = async (): Promise<ViamClient> => {
		const opts: ViamClientOptions = {
			serviceHost: testConfig.signalingAddress,
			credentials: {
				type: 'api-key',
				authEntity: testConfig.apiKeyId,
				payload: testConfig.apiKeyValue,
			},
		}

		const client = await createViamClient(opts)
		return client
	}

	return {
		get page() {
			return page
		},
		get testConfig() {
			return testConfig
		},

		refresh,
		dropFile,
		connect,
		takeScreenshot,
		screenshotCanvas: takeCanvasScreenshot,
	}
}
