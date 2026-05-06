import { expect, type Page } from '@playwright/test'

/**
 * Take a snapshot of just the 3D canvas, ignoring DOM overlays (toolbar,
 * tree, details panel, toasts). Use this for tests that verify 3D scene
 * rendering so unrelated UI changes don't invalidate the snapshot.
 *
 * Returns the failed file name on failure (or '' on success) so callers
 * can collect failures and assert at the end of a test.
 */
export const screenshotCanvas = async (page: Page, name: string): Promise<string> => {
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
		await expect(canvas).toHaveScreenshot(`${name}.png`, {
			threshold: 0.1,
		})
		return ''
	} catch (error) {
		console.warn(error)
		return `${name}.png`
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
