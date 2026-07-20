import type { ResourceName } from '@viamrobotics/sdk'
import type { Component } from 'svelte'

import {
	componentApiWidgets,
	componentWidgetForResource,
} from '@viamrobotics/test-widgets/component-registry'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CARD_WIDGET_ID, resourceWidgetToggles } from '$lib/widgets/resourceWidgetToggles'

vi.mock('@viamrobotics/test-widgets/component-registry', () => ({
	componentApiWidgets: vi.fn(),
	componentWidgetForResource: vi.fn(),
}))

const widget = (() => undefined) as unknown as Component<{ partID: string; resourceName: string }>

const resource = (subtype: string, type = 'component', namespace = 'rdk'): ResourceName =>
	({ namespace, type, subtype, name: `my-${subtype}` }) as ResourceName

beforeEach(() => {
	vi.mocked(componentApiWidgets).mockReturnValue([])
	vi.mocked(componentWidgetForResource).mockReturnValue(undefined)
})

describe('resourceWidgetToggles', () => {
	it('returns the per-API widgets (and no card) when the resource has APIs', () => {
		const apis = [{ id: 'get-joint-positions', label: 'GetJointPositions', widgets: [widget] }]
		vi.mocked(componentApiWidgets).mockReturnValue(apis)
		// Even if a card exists, a resource with APIs must not surface it.
		vi.mocked(componentWidgetForResource).mockReturnValue(widget)

		const result = resourceWidgetToggles(resource('arm'))

		expect(result).toBe(apis)
		expect(result.some((toggle) => toggle.id === CARD_WIDGET_ID)).toBe(false)
	})

	it('falls back to a single card toggle when the resource has no APIs', () => {
		vi.mocked(componentWidgetForResource).mockReturnValue(widget)

		const result = resourceWidgetToggles(resource('camera'))

		expect(result).toHaveLength(1)
		expect(result[0]?.id).toBe(CARD_WIDGET_ID)
		expect(result[0]?.widgets).toEqual([widget])
	})

	it('returns nothing when there are no APIs and no card', () => {
		expect(resourceWidgetToggles(resource('generic'))).toEqual([])
	})

	it('does not surface a card for rdk-internal resources', () => {
		vi.mocked(componentWidgetForResource).mockReturnValue(widget)

		expect(resourceWidgetToggles(resource('sensor', 'component', 'rdk-internal'))).toEqual([])
	})

	it('excludes non-component (service) resources without consulting the registry', () => {
		// Services (motion, slam, navigation, …) are not represented in the visualizer.
		vi.mocked(componentApiWidgets).mockReturnValue([
			{ id: 'get-position', label: 'GetPosition', widgets: [widget] },
		])
		vi.mocked(componentWidgetForResource).mockReturnValue(widget)

		expect(resourceWidgetToggles(resource('slam', 'service'))).toEqual([])
		expect(componentApiWidgets).not.toHaveBeenCalled()
	})
})
