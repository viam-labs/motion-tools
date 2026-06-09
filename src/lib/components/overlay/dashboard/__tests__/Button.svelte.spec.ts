import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import Button from '../Button.svelte'

describe('<Button> (dashboard)', () => {
	it('renders a radio button with the given description', () => {
		render(Button, {
			props: { icon: 'cursor-move', description: 'Translate', active: false },
		})

		const radio = screen.getByRole('radio', { name: 'Translate' })
		expect(radio).toBeInTheDocument()
		expect(radio).toHaveAttribute('aria-checked', 'false')
	})

	it('marks the radio as checked when active', () => {
		render(Button, {
			props: { icon: 'cursor-move', description: 'Translate', active: true },
		})

		expect(screen.getByRole('radio', { name: 'Translate' })).toHaveAttribute('aria-checked', 'true')
	})

	it('applies dark gray active styles when active', () => {
		render(Button, {
			props: { icon: 'cursor-move', description: 'Translate', active: true },
		})

		const label = screen.getByRole('radio', { name: 'Translate' }).closest('label')!
		expect(label.className).toContain('bg-gray-8')
		expect(label.className).toContain('text-white')
		expect(label.className).toContain('border-gray-8')
	})

	it('applies light inactive styles when not active', () => {
		render(Button, {
			props: { icon: 'cursor-move', description: 'Translate', active: false },
		})

		const label = screen.getByRole('radio', { name: 'Translate' }).closest('label')!
		expect(label.className).toContain('bg-light')
		expect(label.className).toContain('text-gray-8')
		expect(label.className).toContain('border-gray-5')
	})

	it('renders the hotkey in the tooltip description', () => {
		render(Button, {
			props: { icon: 'cursor-move', description: 'Translate', hotkey: '1' },
		})

		expect(screen.getByText('1')).toBeInTheDocument()
	})

	it('preserves aria and role when disableTooltip is true and active', () => {
		render(Button, {
			props: {
				icon: 'cursor-move',
				description: 'Translate',
				active: true,
				disableTooltip: true,
			},
		})

		const radio = screen.getByRole('radio', { name: 'Translate' })
		expect(radio).toBeInTheDocument()
		expect(radio).toHaveAttribute('aria-checked', 'true')
	})

	it('preserves aria and role when disableTooltip is true and inactive', () => {
		render(Button, {
			props: {
				icon: 'cursor-move',
				description: 'Translate',
				active: false,
				disableTooltip: true,
			},
		})

		const radio = screen.getByRole('radio', { name: 'Translate' })
		expect(radio).toBeInTheDocument()
		expect(radio).toHaveAttribute('aria-checked', 'false')
	})
})
