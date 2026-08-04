import { test } from '@playwright/test'

const getE2EConfig = () => {
	const host = process.env.VIAM_E2E_HOST
	const partId = process.env.VIAM_E2E_PART_ID
	const apiKeyId = process.env.VIAM_E2E_API_KEY_ID
	const apiKey = process.env.VIAM_E2E_API_KEY
	const signalingAddress = process.env.VIAM_E2E_SIGNALING_ADDRESS ?? 'https://app.viam.com:443'

	if (!host || !partId || !apiKeyId || !apiKey) {
		throw new Error(
			'Missing E2E environment variables. The global setup may not have run.\n' +
				'Make sure playwright.config.ts has globalSetup configured.'
		)
	}

	return { host, partId, apiKeyId, apiKey, signalingAddress }
}

test('test', async ({ page }) => {
	const { host, partId, apiKeyId, apiKey, signalingAddress } = getE2EConfig()

	await page.goto('https://viamrobotics.github.io/visualization/playground/')
	await page.getByRole('button', { name: 'Machine connection configs' }).click()
	await page.getByRole('button', { name: 'Add config' }).click()
	await page.getByRole('textbox', { name: 'Host' }).click()
	await page.getByRole('textbox', { name: 'Host' }).click()
	await page.getByRole('textbox', { name: 'Host' }).click()
	await page.getByRole('textbox', { name: 'Host' }).fill(host)
	await page.getByRole('button', { name: 'Expand connection config' }).click()
	await page.getByRole('button', { name: 'Expand connection config' }).click()
	await page.getByRole('textbox', { name: 'Part ID' }).click()
	await page.getByRole('textbox', { name: 'Part ID' }).fill(partId)
	await page.getByRole('textbox', { name: 'API key ID' }).click()
	await page.getByRole('textbox', { name: 'API key ID' }).click()
	await page.getByRole('textbox', { name: 'API key ID' }).fill(apiKeyId)
	await page.getByRole('textbox', { name: 'API key value' }).dblclick()
	await page.getByRole('textbox', { name: 'API key value' }).fill(apiKey)
	await page.getByRole('textbox', { name: 'Signaling address' }).dblclick()
	await page.getByRole('textbox', { name: 'Signaling address' }).fill(signalingAddress)
	await page.getByRole('button', { name: 'Expand connection config' }).click()
	await page.locator('canvas').click({
		position: {
			x: 1044,
			y: 133,
		},
	})
	await page.getByRole('button', { name: 'Close connection configs panel' }).click()
})
