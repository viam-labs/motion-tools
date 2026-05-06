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
	const style = await page.addStyleTag({
		content: `* { visibility: hidden !important; } canvas { visibility: visible !important; }`,
	})
	try {
		await expect(page.locator('canvas').first()).toHaveScreenshot(`${name}.png`, {
			threshold: 0.1,
		})
		return ''
	} catch (error) {
		console.warn(error)
		return `${name}.png`
	} finally {
		await style.evaluate((node: Element) => node.remove())
	}
}
