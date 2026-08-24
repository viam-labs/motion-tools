import { type Browser, expect, type Page } from '@playwright/test'
import fs from 'node:fs'

import { openScene } from './helpers/openScene'
import { screenshotCanvas } from './helpers/screenshot'

interface TestPage {
	page: Page
	takeScreenshot: (testPrefix: string) => Promise<void>
	screenshotCanvas: (testPrefix: string) => Promise<void>
	dropFile: (file: string | { name: string; content: string }) => Promise<void>
}

export const createPage = async (browser: Browser): Promise<TestPage> => {
	const page = await openScene(browser)

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

	return {
		page,
		dropFile,
		takeScreenshot,
		screenshotCanvas: takeCanvasScreenshot,
	}
}
