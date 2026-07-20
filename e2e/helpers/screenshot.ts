import { expect, type Page } from '@playwright/test'

/**
 * Runs `fn` with every DOM overlay (toolbar, tree, details panel, toasts)
 * hidden, so only the 3D canvas is visible. Restores the overlays afterwards
 * even if `fn` throws. Used by the canvas screenshot helpers so unrelated UI
 * doesn't leak into 3D-rendering assertions.
 */
const withOverlaysHidden = async <T>(page: Page, fn: () => Promise<T>): Promise<T> => {
	const canvas = page.locator('canvas').first()

	await canvas.evaluate((node) => {
		const hidden: HTMLElement[] = []
		let el: Element | null = node
		while (el && el.parentElement) {
			for (const sibling of el.parentElement.children) {
				if (sibling !== el && sibling instanceof HTMLElement) {
					hidden.push(sibling)
					sibling.dataset.screenshotPrevDisplay = sibling.style.display
					sibling.style.display = 'none'
				}
			}
			el = el.parentElement
		}
		;(globalThis as unknown as { __screenshotHidden: HTMLElement[] }).__screenshotHidden = hidden
	})

	try {
		return await fn()
	} finally {
		await page.evaluate(() => {
			const store = globalThis as unknown as { __screenshotHidden?: HTMLElement[] }
			for (const el of store.__screenshotHidden ?? []) {
				el.style.display = el.dataset.screenshotPrevDisplay ?? ''
				delete el.dataset.screenshotPrevDisplay
			}
			delete store.__screenshotHidden
		})
	}
}

export const screenshotCanvas = async (page: Page, name: string): Promise<string> => {
	return withOverlaysHidden(page, async () => {
		try {
			await expect(page.locator('canvas').first()).toHaveScreenshot(`${name}.png`, {
				threshold: 0.1,
			})
			return ''
		} catch (error) {
			console.warn(error)
			return `${name}.png`
		}
	})
}

export const captureCanvas = async (page: Page): Promise<Buffer> => {
	return withOverlaysHidden(page, () => page.locator('canvas').first().screenshot())
}

export const waitForCanvasToChange = async (
	page: Page,
	reference: Buffer,
	timeoutMs = 10000
): Promise<Buffer | null> => {
	return withOverlaysHidden(page, async () => {
		const canvas = page.locator('canvas').first()
		const deadline = Date.now() + timeoutMs
		while (Date.now() < deadline) {
			const current = await canvas.screenshot()
			if (!current.equals(reference)) {
				return current
			}
			await page.waitForTimeout(150)
		}
		return null
	})
}
