import { test } from '@playwright/test'

test('test', async ({ page }) => {
	await page.goto('https://viamrobotics.github.io/visualization/playground/')
	await page.getByRole('button', { name: 'Machine connection configs' }).click()
	await page.getByRole('button', { name: 'Add config' }).click()
	await page.getByRole('textbox', { name: 'Host' }).click()
	await page.getByRole('textbox', { name: 'Host' }).click()
	await page.getByRole('textbox', { name: 'Host' }).click()
	await page.getByRole('textbox', { name: 'Host' }).fill('test-rdk-main.i6h2oo7033.viam.cloud')
	await page.getByRole('button', { name: 'Expand connection config' }).click()
	await page.getByRole('button', { name: 'Expand connection config' }).click()
	await page.getByRole('textbox', { name: 'Part ID' }).click()
	await page.getByRole('textbox', { name: 'Part ID' }).fill('06a3121a-520e-4d23-8d1e-e3908bde1eea')
	await page.getByRole('textbox', { name: 'API key ID' }).click()
	await page.getByRole('textbox', { name: 'API key ID' }).click()
	await page
		.getByRole('textbox', { name: 'API key ID' })
		.fill('b3242cee-eade-4123-9633-5a1f2999920a')
	await page.getByRole('textbox', { name: 'API key value' }).dblclick()
	await page
		.getByRole('textbox', { name: 'API key value' })
		.fill('c4y8bry090n1ydijv40id3zttbzgag5n')
	await page.getByRole('textbox', { name: 'Signaling address' }).dblclick()
	await page.getByRole('textbox', { name: 'Signaling address' }).fill('https://app.viam.com:443')
	await page.getByRole('button', { name: 'Expand connection config' }).click()
	await page.locator('canvas').click({
		position: {
			x: 1044,
			y: 133,
		},
	})
	await page.getByRole('button', { name: 'Close connection configs panel' }).click()
})
