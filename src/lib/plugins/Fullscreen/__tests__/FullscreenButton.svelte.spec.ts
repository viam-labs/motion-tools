import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import FullscreenButton from '../FullscreenButton.svelte'

import '@testing-library/jest-dom/vitest'

describe('<FullscreenButton>', () => {
	it('toggles fullscreen on click', async () => {
		const user = userEvent.setup()
		render(FullscreenButton, { props: { fullscreen: false } })

		const button = screen.getByRole('button', { name: 'Enter fullscreen' })
		expect(button).toHaveAttribute('aria-pressed', 'false')

		await user.click(button)

		expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toHaveAttribute(
			'aria-pressed',
			'true'
		)
	})

	it('locks page scroll while fullscreen and restores it on exit', async () => {
		const user = userEvent.setup()
		render(FullscreenButton, { props: { fullscreen: false } })

		await user.click(screen.getByRole('button', { name: 'Enter fullscreen' }))

		expect(document.body.style.overflow).toBe('hidden')
		expect(document.documentElement.style.overflow).toBe('hidden')

		await user.click(screen.getByRole('button', { name: 'Exit fullscreen' }))

		expect(document.body.style.overflow).toBe('')
		expect(document.documentElement.style.overflow).toBe('')
	})
})
