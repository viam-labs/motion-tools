import { type Browser, expect, type Page } from '@playwright/test'

/**
 * Opens the app in a fresh context and waits until the scene is interactive.
 *
 * `goto('')` rather than `'/'` so a baseURL carrying a path — the hosted
 * playground — resolves against it instead of jumping to the host root.
 * Console output is opt-in because retained traces already capture it.
 */
export const openScene = async (browser: Browser): Promise<Page> => {
	const context = await browser.newContext()
	const page = await context.newPage()

	if (process.env.E2E_DEBUG) {
		page.on('console', (message) => {
			console.log(`[${message.type()}] ${message.text()}`)
		})
	}

	await page.goto('')
	await page.waitForLoadState('load')
	await expect(page.getByRole('heading', { name: 'World', exact: true })).toBeVisible({
		timeout: 15_000,
	})

	return page
}
