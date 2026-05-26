<script lang="ts">
	import { Portal } from '@threlte/extras'
	import { type ConfigurableTrait } from 'koota'
	import { tick } from 'svelte'
	import {
		Folder,
		List,
		type ListChangeEvent,
		Pane,
		Separator,
		Button as TPButton,
	} from 'svelte-tweakpane-ui'
	import { Matrix4, Quaternion, Vector3 } from 'three'

	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import Popover from '$lib/components/overlay/Popover.svelte'
	import { traits, useWorld } from '$lib/ecs'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import GizmoDetails from './GizmoDetails.svelte'
	import { GIZMO_COLOR, spawnGizmo } from './spawn'
	import ArrowTool from './tools/ArrowTool.svelte'
	import CoordinateSystemTool from './tools/CoordinateSystemTool.svelte'
	import LineTool from './tools/LineTool.svelte'
	import { Plane } from './traits'
	import {
		type ArrowOrientation,
		type GeometryShape,
		type GizmoMode,
		type LineSpace,
		type PlaneAxis,
		provideGizmosPlugin,
	} from './useGizmosPlugin.svelte'

	const settings = useSettings()
	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const plugin = provideGizmosPlugin(() => toggleOff())

	const isGizmoMode = $derived(settings.current.interactionMode === 'gizmo')

	// Keep the global interactionMode and our local plugin mode in sync. When
	// the user switches to another tool (selection/measure), our mode resets.
	$effect(() => {
		if (!isGizmoMode && plugin.mode !== 'idle') {
			plugin.mode = 'idle'
		}
	})

	const pick = (mode: GizmoMode) => {
		settings.current.interactionMode = 'gizmo'
		plugin.mode = mode
	}

	const toggleOff = () => {
		settings.current.interactionMode = 'navigate'
		plugin.mode = 'idle'
	}

	// Accordion: only one Folder may be expanded at a time. Function bindings
	// (`bind:expanded={() => …, (v) => …}`) on each Folder both read this state
	// and route user clicks back into it so opening one collapses the rest.
	type FolderName = 'plane' | 'geometry' | 'line' | 'arrow'
	let openFolder = $state<FolderName | null>(null)
	const setOpenFolder = (name: FolderName, expanded: boolean) => {
		// When another folder takes ownership of `openFolder`, this folder's
		// getter starts returning `false` and the tweakpane Folder will echo
		// that back as setOpenFolder(name, false). Ignore those "I'm being
		// collapsed because someone else opened" calls — only clear when
		// collapsing the currently-open folder.
		if (expanded) openFolder = name
		else if (openFolder === name) openFolder = null
	}

	// PlaneGeometry's normal is +Z by default. Bake the axis rotation into the
	// spawn matrix so the new plane faces the user-selected axis from origin.
	const tempQuat = new Quaternion()
	const xAxis = new Vector3(1, 0, 0)
	const yAxis = new Vector3(0, 1, 0)
	const matrixForAxis = (axis: PlaneAxis): Matrix4 => {
		if (axis === 'x') tempQuat.setFromAxisAngle(yAxis, Math.PI / 2)
		else if (axis === 'y') tempQuat.setFromAxisAngle(xAxis, -Math.PI / 2)
		else tempQuat.identity()
		return new Matrix4().makeRotationFromQuaternion(tempQuat)
	}

	// `useSelectedObject3d` looks up the renderer mesh by entity name via
	// `scene.getObjectByName(...)` exactly once per selection change. Wait for
	// Svelte to flush so the entity's renderer has mounted into the scene
	// before selecting it, otherwise SelectedTransformControls never finds a
	// `ref` and the transform gizmo silently fails to appear.
	const placePlane = async () => {
		const entity = spawnGizmo(world, {
			kind: 'plane',
			extras: [
				Plane({ width: 5000, height: 5000 }),
				traits.Color(GIZMO_COLOR),
				traits.Opacity(0.7),
			],
			matrix: matrixForAxis(plugin.planeAxis),
		})
		await tick()
		selectedEntity.set(entity)
	}

	const placeGeometry = async () => {
		const geometry: ConfigurableTrait =
			plugin.geometryShape === 'box'
				? traits.Box({ x: 200, y: 200, z: 200 })
				: plugin.geometryShape === 'sphere'
					? traits.Sphere({ r: 100 })
					: traits.Capsule({ l: 200, r: 50 })
		const extras: ConfigurableTrait[] = [geometry, traits.Color(GIZMO_COLOR)]
		// Wireframe is rendered by Mesh.svelte's EdgesGeometry child, which has
		// no opacity binding — so hiding the solid via Opacity(0) leaves edges
		// visible. See the "wireframe is opacity=0" branch in the renderer.
		if (plugin.wireframe) extras.push(traits.Opacity(0))
		const entity = spawnGizmo(world, { kind: plugin.geometryShape, extras })
		await tick()
		selectedEntity.set(entity)
	}

	// List option arrays. svelte-tweakpane-ui re-creates the blade when the
	// reference identity of `options` changes, so build them once at module
	// scope instead of inline in markup.
	const axisOptions = [
		{ value: 'x', text: 'X' },
		{ value: 'y', text: 'Y' },
		{ value: 'z', text: 'Z' },
	] satisfies { value: PlaneAxis; text: string }[]

	const wireframeOptions = [
		{ value: false, text: 'Solid' },
		{ value: true, text: 'Wireframe' },
	]

	const lineSpaceOptions = [
		{ value: 'world', text: 'World' },
		{ value: 'screen', text: 'Screen' },
	] satisfies { value: LineSpace; text: string }[]

	const arrowOrientationOptions = [
		{ value: 'from', text: 'From (origin at point)' },
		{ value: 'to', text: 'To (head at point)' },
	] satisfies { value: ArrowOrientation; text: string }[]

	const geometryShapeOptions = [
		{ value: 'box', text: 'Box' },
		{ value: 'sphere', text: 'Sphere' },
		{ value: 'capsule', text: 'Capsule' },
	] satisfies { value: GeometryShape; text: string }[]
</script>

<Portal id="dashboard">
	<fieldset class="relative">
		<Popover>
			{#snippet trigger(triggerProps, { isOpen })}
				<DashboardButton
					{...triggerProps}
					active={isGizmoMode || isOpen}
					icon="shapes"
					description={isGizmoMode ? `Gizmo: ${plugin.mode}` : 'Add gizmo'}
				/>
			{/snippet}

			{#snippet children({ close })}
				<div class="m-2 w-64">
					<Pane
						position="inline"
						title="Gizmos"
						userExpandable={false}
					>
						<TPButton
							title="Place coordinate system"
							on:click={() => {
								pick('coordinate-system')
								close()
							}}
						/>

						<Folder
							title="Plane"
							bind:expanded={() => openFolder === 'plane', (v) => setOpenFolder('plane', v)}
						>
							<List
								label="Axis"
								options={axisOptions}
								value={plugin.planeAxis}
								on:change={(event: ListChangeEvent) => {
									plugin.planeAxis = event.detail.value as PlaneAxis
								}}
							/>
							<TPButton
								title="Add plane"
								on:click={() => {
									placePlane()
									close()
								}}
							/>
						</Folder>

						<Folder
							title="Geometry"
							bind:expanded={() => openFolder === 'geometry', (v) => setOpenFolder('geometry', v)}
						>
							<List
								label="Shape"
								options={geometryShapeOptions}
								value={plugin.geometryShape}
								on:change={(event: ListChangeEvent) => {
									plugin.geometryShape = event.detail.value as GeometryShape
								}}
							/>
							<List
								label="Type"
								options={wireframeOptions}
								value={plugin.wireframe}
								on:change={(event: ListChangeEvent) => {
									plugin.wireframe = event.detail.value as boolean
								}}
							/>
							<TPButton
								title="Add geometry"
								on:click={() => {
									placeGeometry()
									close()
								}}
							/>
						</Folder>

						<Folder
							title="Line"
							bind:expanded={() => openFolder === 'line', (v) => setOpenFolder('line', v)}
						>
							<List
								label="Space"
								options={lineSpaceOptions}
								value={plugin.lineSpace}
								on:change={(event: ListChangeEvent) => {
									plugin.lineSpace = event.detail.value as LineSpace
								}}
							/>
							<TPButton
								title="Place line"
								on:click={() => {
									pick('line')
									close()
								}}
							/>
						</Folder>

						<Folder
							title="Arrow"
							bind:expanded={() => openFolder === 'arrow', (v) => setOpenFolder('arrow', v)}
						>
							<List
								label="Orientation"
								options={arrowOrientationOptions}
								value={plugin.arrowOrientation}
								on:change={(event: ListChangeEvent) => {
									plugin.arrowOrientation = event.detail.value as ArrowOrientation
								}}
							/>
							<TPButton
								title="Place arrow"
								on:click={() => {
									pick('arrow')
									close()
								}}
							/>
						</Folder>

						{#if isGizmoMode}
							<Separator />
							<TPButton
								title="Exit gizmo mode"
								on:click={() => {
									toggleOff()
									close()
								}}
							/>
						{/if}
					</Pane>
				</div>
			{/snippet}
		</Popover>
	</fieldset>
</Portal>

{#if isGizmoMode}
	{#if plugin.mode === 'coordinate-system'}
		<CoordinateSystemTool />
	{:else if plugin.mode === 'line'}
		<LineTool />
	{:else if plugin.mode === 'arrow'}
		<ArrowTool />
	{/if}
{/if}

<!--
	Always mounted so the gizmo badge / line editor appears in the Details
	panel whenever a gizmo is selected — independent of whether the user is
	currently in gizmo placement mode.
-->
<GizmoDetails />
