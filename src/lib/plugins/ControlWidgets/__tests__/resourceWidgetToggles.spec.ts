import type { ResourceName } from '@viamrobotics/sdk'
import type { Component } from 'svelte'

import { showResourceWidget } from '@viamrobotics/test-widgets'
import { apiWidgetsForResource, widgetForResource } from '@viamrobotics/test-widgets/registry'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CARD_WIDGET_ID, resourceWidgetToggles } from '../resourceWidgetToggles'

vi.mock('@viamrobotics/test-widgets/registry', () => ({
	apiWidgetsForResource: vi.fn(),
	widgetForResource: vi.fn(),
}))

vi.mock('@viamrobotics/test-widgets', () => ({
	showResourceWidget: vi.fn(),
}))

const widget = (() => undefined) as unknown as Component<{ partID: string; resourceName: string }>

const resource = (subtype: string, type = 'component', namespace = 'rdk'): ResourceName =>
	({ namespace, type, subtype, name: `my-${subtype}` }) as ResourceName

beforeEach(() => {
	vi.mocked(apiWidgetsForResource).mockReturnValue([])
	vi.mocked(widgetForResource).mockReturnValue(undefined)
	vi.mocked(showResourceWidget).mockReturnValue(true)
})

describe('resourceWidgetToggles', () => {
	it('returns the per-API widgets (and no card) when the resource has APIs', () => {
		const apis = [{ id: 'get-joint-positions', label: 'GetJointPositions', widgets: [widget] }]
		vi.mocked(apiWidgetsForResource).mockReturnValue(apis)
		// Even if a card exists, a resource with APIs must not surface it.
		vi.mocked(widgetForResource).mockReturnValue(widget)

		const result = resourceWidgetToggles(resource('arm'))

		expect(result).toBe(apis)
		expect(result.some((toggle) => toggle.id === CARD_WIDGET_ID)).toBe(false)
	})

	it('falls back to a single card toggle when the resource has no APIs', () => {
		vi.mocked(widgetForResource).mockReturnValue(widget)

		const result = resourceWidgetToggles(resource('camera'))

		expect(result).toHaveLength(1)
		expect(result[0]?.id).toBe(CARD_WIDGET_ID)
		expect(result[0]?.widgets).toEqual([widget])
	})

	it('returns nothing when there are no APIs and no card', () => {
		expect(resourceWidgetToggles(resource('generic'))).toEqual([])
	})

	it('does not surface a card when the registry hides the resource', () => {
		vi.mocked(widgetForResource).mockReturnValue(widget)
		vi.mocked(showResourceWidget).mockReturnValue(false)

		expect(resourceWidgetToggles(resource('sensor', 'component', 'rdk-internal'))).toEqual([])
	})

	it('includes services that expose per-API widgets (e.g. the motion move widget)', () => {
		const apis = [{ id: 'move', label: 'Move', widgets: [widget] }]
		vi.mocked(apiWidgetsForResource).mockReturnValue(apis)

		expect(resourceWidgetToggles(resource('motion', 'service'))).toBe(apis)
	})

	it('includes a service card when the registry surfaces one', () => {
		vi.mocked(widgetForResource).mockReturnValue(widget)

		const result = resourceWidgetToggles(resource('navigation', 'service'))

		expect(result).toHaveLength(1)
		expect(result[0]?.id).toBe(CARD_WIDGET_ID)
	})
})
