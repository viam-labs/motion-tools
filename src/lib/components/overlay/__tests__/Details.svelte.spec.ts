import { fireEvent, render, screen } from '@testing-library/svelte'
import { createWorld, type Entity } from 'koota'
import { on } from 'svelte/events'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { traits } from '$lib/ecs'
import { WORLD_CONTEXT_KEY } from '$lib/ecs/useWorld'
import { BUILD_MODE_SYNC_CONTEXT_KEY } from '$lib/hooks/useBuildModeSync.svelte'
import * as useConfigFrames from '$lib/hooks/useConfigFrames.svelte'
import {
	createEnvironment,
	ENVIRONMENT_CONTEXT_KEY,
	ENVIRONMENT_MODE_STORAGE_KEY,
} from '$lib/hooks/useEnvironment.svelte'
import * as useFragmentInfo from '$lib/hooks/useFragmentInfo.svelte'
import * as useLinkedEntities from '$lib/hooks/useLinked.svelte'
import * as usePartConfig from '$lib/hooks/usePartConfig.svelte'
import * as useResourceByName from '$lib/hooks/useResourceByName.svelte'
import { createWeblabs, WEBLABS_CONTEXT_KEY } from '$lib/hooks/useWeblabs.svelte'

import Details from '../Details.svelte'
import { createEntityFixture } from './__fixtures__/entity'
import { resource } from './__fixtures__/resource'

describe('Details component', () => {
	const world = createWorld()

	let entity: Entity

	beforeEach(() => {
		localStorage.removeItem(ENVIRONMENT_MODE_STORAGE_KEY)

		world.reset()

		entity = createEntityFixture(world)

		vi.mocked(useResourceByName.useResourceByName).mockReturnValue({
			current: {},
		})
		vi.mocked(useFragmentInfo.useFragmentInfo).mockReturnValue({
			current: {},
		})
		vi.mocked(useConfigFrames.useConfigFrames).mockReturnValue({
			unsetFrames: [],
			current: {},
		})
		vi.mocked(usePartConfig.usePartConfig).mockReturnValue({
			current: { components: [] },
			isReady: true,
			updateFrame: vi.fn(),
			isDirty: false,
			save: vi.fn(),
			discardChanges: vi.fn(),
			deleteFrame: vi.fn(),
			createFrame: vi.fn(),
			hasEditPermissions: true,
			canUndoFrameEdit: false,
			canRedoFrameEdit: false,
			undoFrameEdit: vi.fn(),
			redoFrameEdit: vi.fn(),
			beginFrameEditHistoryEntry: vi.fn(),
			endFrameEditHistoryEntry: vi.fn(),
		})
		vi.mocked(useLinkedEntities.useLinkedEntities).mockReturnValue({
			current: [],
		})
	})

	it('renders object name', () => {
		const context = createWeblabs()
		render(Details, {
			props: { entity },
			context: new Map<symbol, unknown>([
				[WEBLABS_CONTEXT_KEY, context],
				[ENVIRONMENT_CONTEXT_KEY, createEnvironment()],
				[WORLD_CONTEXT_KEY, world],
			]),
		})
		expect(screen.getByText('Test Object')).toBeInTheDocument()
	})

	it('renders local details', () => {
		const weblabContext = createWeblabs()
		weblabContext.isActive = vi.fn(() => true)
		const environmentContext = createEnvironment()
		environmentContext.current.isStandalone = true
		const context = new Map<symbol, unknown>([
			[WEBLABS_CONTEXT_KEY, weblabContext],
			[ENVIRONMENT_CONTEXT_KEY, environmentContext],
			[WORLD_CONTEXT_KEY, world],
		])

		render(Details, { props: { entity }, context })
		expect(screen.getByText('parent frame')).toBeInTheDocument()
		const parentFrameNameSpan = screen.getByLabelText('immutable parent frame name')
		const parentFrameNameText = parentFrameNameSpan.nextSibling as HTMLElement
		expect(parentFrameNameText.textContent?.trim()).toBe('parent_frame')

		expect(screen.getByText('local position')).toBeInTheDocument()

		const localPositionXSpan = screen.getByLabelText('immutable local position x coordinate')
		const localPositionXText = localPositionXSpan.nextSibling as HTMLElement
		expect(localPositionXText.textContent?.trim()).toBe((10).toFixed(2))

		const localPositionYSpan = screen.getByLabelText('immutable local position y coordinate')
		const localPositionYText = localPositionYSpan.nextSibling as HTMLElement
		expect(localPositionYText.textContent?.trim()).toBe((20).toFixed(2))

		const localPositionZSpan = screen.getByLabelText('immutable local position z coordinate')
		const localPositionZText = localPositionZSpan.nextSibling as HTMLElement
		expect(localPositionZText.textContent?.trim()).toBe((30).toFixed(2))

		expect(screen.getByText('local orientation')).toBeInTheDocument()

		const localOrientationXSpan = screen.getByLabelText('immutable local orientation x coordinate')
		const localOrientationXText = localOrientationXSpan.nextSibling as HTMLElement
		expect(localOrientationXText.textContent?.trim()).toBe((0.6).toFixed(2))

		const localOrientationYSpan = screen.getByLabelText('immutable local orientation y coordinate')
		const localOrientationYText = localOrientationYSpan.nextSibling as HTMLElement
		expect(localOrientationYText.textContent?.trim()).toBe((0.8).toFixed(2))

		const localOrientationZSpan = screen.getByLabelText('immutable local orientation z coordinate')
		const localOrientationZText = localOrientationZSpan.nextSibling as HTMLElement
		expect(localOrientationZText.textContent?.trim()).toBe((0).toFixed(2))

		const localOrientationThSpan = screen.getByLabelText(
			'immutable local orientation theta degrees'
		)
		const localOrientationThText = localOrientationThSpan.nextSibling as HTMLElement
		expect(localOrientationThText.textContent?.trim()).toBe((0.4).toFixed(2))
	})

	it('renders update fields for frame nodes', () => {
		const weblabContext = createWeblabs()
		weblabContext.isActive = vi.fn(() => true)
		const environmentContext = createEnvironment()
		environmentContext.current.isStandalone = true
		// Register build as mounting the BuildFrames plugin would, so it can be entered.
		environmentContext.registerMode('build')
		environmentContext.current.mode = 'build'

		entity.add(traits.FramesAPI)
		entity.add(traits.Editable)

		vi.mocked(usePartConfig.usePartConfig).mockReturnValue({
			current: {
				components: [resource],
			},
			isReady: true,
			updateFrame: vi.fn(),
			isDirty: false,
			save: vi.fn(),
			discardChanges: vi.fn(),
			deleteFrame: vi.fn(),
			createFrame: vi.fn(),
			hasEditPermissions: true,
			canUndoFrameEdit: false,
			canRedoFrameEdit: false,
			undoFrameEdit: vi.fn(),
			redoFrameEdit: vi.fn(),
			beginFrameEditHistoryEntry: vi.fn(),
			endFrameEditHistoryEntry: vi.fn(),
		})

		const context = new Map<symbol, unknown>([
			[WEBLABS_CONTEXT_KEY, weblabContext],
			[ENVIRONMENT_CONTEXT_KEY, environmentContext],
			[BUILD_MODE_SYNC_CONTEXT_KEY, { syncing: false }],
			[WORLD_CONTEXT_KEY, world],
		])

		render(Details, { props: { entity }, context })

		const positionGroup = screen.getByLabelText('mutable local position')
		expect(positionGroup).toBeInTheDocument()
		expect(positionGroup.querySelectorAll('input')).toHaveLength(3)

		const orientationGroup = screen.getByLabelText('mutable local orientation')
		expect(orientationGroup).toBeInTheDocument()
		// 4 OV inputs (x, y, z, theta) plus 3 Euler inputs (x, y, z) — both
		// TabPages are mounted simultaneously by tweakpane's TabGroup.
		expect(orientationGroup.querySelectorAll('input')).toHaveLength(7)
	})

	it('stops keyboard events from propagating out of the panel', async () => {
		const weblabContext = createWeblabs()
		weblabContext.isActive = vi.fn(() => true)
		const environmentContext = createEnvironment()
		environmentContext.current.isStandalone = true
		// Register build as mounting the BuildFrames plugin would, so it can be entered.
		environmentContext.registerMode('build')
		environmentContext.current.mode = 'build'

		entity.add(traits.FramesAPI)
		entity.add(traits.Editable)

		vi.mocked(usePartConfig.usePartConfig).mockReturnValue({
			current: {
				components: [resource],
			},
			isReady: true,
			updateFrame: vi.fn(),
			isDirty: false,
			save: vi.fn(),
			discardChanges: vi.fn(),
			deleteFrame: vi.fn(),
			createFrame: vi.fn(),
			hasEditPermissions: true,
			canUndoFrameEdit: false,
			canRedoFrameEdit: false,
			undoFrameEdit: vi.fn(),
			redoFrameEdit: vi.fn(),
			beginFrameEditHistoryEntry: vi.fn(),
			endFrameEditHistoryEntry: vi.fn(),
		})

		const { container } = render(Details, {
			props: { entity },
			context: new Map<symbol, unknown>([
				[WEBLABS_CONTEXT_KEY, weblabContext],
				[ENVIRONMENT_CONTEXT_KEY, environmentContext],
				[BUILD_MODE_SYNC_CONTEXT_KEY, { syncing: false }],
				[WORLD_CONTEXT_KEY, world],
			]),
		})

		// Svelte 5 delegates keydown and keyup. Using `on` from svelte/events puts this listener in the same propagation chain as onkeydown.
		const parentListener = vi.fn()
		const stopKeydown = on(container, 'keydown', parentListener)
		const stopKeyup = on(container, 'keyup', parentListener)

		const panel = screen.getByRole('region', { name: 'Details panel' })
		const positionGroup = screen.getByLabelText('mutable local position')
		const input = positionGroup.querySelector('input')

		expect(input).not.toBeNull()
		expect(panel.contains(input)).toBe(true)

		input!.focus()
		expect(document.activeElement).toBe(input)

		await fireEvent.keyDown(input!, { key: 'ArrowDown', bubbles: true })
		await fireEvent.keyUp(input!, { key: 'ArrowDown', bubbles: true })

		expect(parentListener).not.toHaveBeenCalled()

		stopKeydown()
		stopKeyup()
	})
})
