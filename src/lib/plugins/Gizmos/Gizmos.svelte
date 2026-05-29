<script
	lang="ts"
	module
>
	const axisOptions = [
		{ value: 'yz', text: 'YZ plane' },
		{ value: 'xz', text: 'XZ plane' },
		{ value: 'xy', text: 'XY plane' },
	] satisfies { value: PlaneAxis; text: string }[]

	const planePlacements = [
		{ value: 'free', text: 'Free (click to place)' },
		{ value: 'offset', text: 'Offset from coordinate plane' },
	] satisfies { value: PlanePlacement; text: string }[]

	const wireframeOptions = [
		{ value: false, text: 'Solid' },
		{ value: true, text: 'Wireframe' },
	]

	const lineSpaceOptions = [
		{ value: 'world', text: 'World' },
		{ value: 'screen', text: 'Screen' },
	] satisfies { value: LineSpace; text: string }[]

	const lineMeasureOptions = [
		{ value: 'none', text: 'Off' },
		{ value: 'segment', text: 'Per segment' },
		{ value: 'total', text: 'Total length' },
	] satisfies { value: LineMeasure; text: string }[]

	const arrowAxisOptions = [
		{ value: 'surface', text: 'Surface normal' },
		{ value: 'x', text: 'X' },
		{ value: 'y', text: 'Y' },
		{ value: 'z', text: 'Z' },
	] satisfies { value: ArrowAxis; text: string }[]

	const geometryPlacementOptions = [
		{ value: 'at-origin', text: 'At origin' },
		{ value: 'free', text: 'Free (click to place)' },
	] satisfies { value: GeometryPlacement; text: string }[]

	const geometryShapeOptions = [
		{ value: 'box', text: 'Box' },
		{ value: 'sphere', text: 'Sphere' },
		{ value: 'capsule', text: 'Capsule' },
	] satisfies { value: GeometryShape; text: string }[]
</script>

<script lang="ts">
	import { Portal } from '@threlte/extras'
	import {
		Folder,
		List,
		type ListChangeEvent,
		Pane,
		Separator,
		Slider,
		type SliderChangeEvent,
		Button as TPButton,
	} from 'svelte-tweakpane-ui'

	import { asRGB } from '$lib/buffer'
	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import Popover from '$lib/components/overlay/Popover.svelte'
	import { traits, useWorld } from '$lib/ecs'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import GizmoDetails from './GizmoDetails.svelte'
	import { planeMatrix } from './planeMatrix'
	import PolylineMeasureRenderer from './PolylineMeasureRenderer.svelte'
	import { REFERENCE_GEOMETRY_COLOR, REFERENCE_GEOMETRY_OPACITY, spawnGizmo } from './spawn'
	import SurfaceNormalsRenderer from './SurfaceNormalsRenderer.svelte'
	import ArrowTool from './tools/ArrowTool.svelte'
	import CoordinateSystemTool from './tools/CoordinateSystemTool.svelte'
	import GeometryTool from './tools/GeometryTool.svelte'
	import LineTool from './tools/LineTool.svelte'
	import PlaneTool from './tools/PlaneTool.svelte'
	import SurfaceNormalsTool from './tools/SurfaceNormalsTool.svelte'
	import VertexNormalsTool from './tools/VertexNormalsTool.svelte'
	import { ReferencePlane } from './traits'
	import {
		type ArrowAxis,
		type GeometryPlacement,
		type GeometryShape,
		type GizmoMode,
		type LineMeasure,
		type LineSpace,
		type PlaneAxis,
		type PlanePlacement,
		provideGizmosPlugin,
	} from './useGizmosPlugin.svelte'
	import VertexNormalsRenderer from './VertexNormalsRenderer.svelte'

	const settings = useSettings()
	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const plugin = provideGizmosPlugin(() => toggleOff())

	type FolderName = 'plane' | 'geometry' | 'line' | 'arrow' | 'vertex-normals' | 'surface-normals'
	let openFolder = $state<FolderName>()

	const isGizmoMode = $derived(settings.current.interactionMode === 'gizmo')
	$effect(() => {
		if (!isGizmoMode && plugin.mode !== 'idle') plugin.mode = 'idle'
	})

	const pick = (mode: GizmoMode) => {
		settings.current.interactionMode = 'gizmo'
		plugin.mode = mode
	}

	const toggleOff = () => {
		settings.current.interactionMode = 'navigate'
		plugin.mode = 'idle'
	}

	const setOpenFolder = (name: FolderName, expanded: boolean) => {
		if (expanded) openFolder = name
		else if (openFolder === name) openFolder = undefined
	}

	const placePlaneAtOffset = async () => {
		const offsetMeters = plugin.planeOffset * 0.001
		const position = plugin.planeAxisVector.multiplyScalar(offsetMeters)
		const entity = spawnGizmo(world, {
			kind: 'reference plane',
			traits: [ReferencePlane({ width: 500, height: 500 }), traits.Opacity(0.7)],
			matrix: planeMatrix(plugin.planeAxis, position),
		})

		selectedEntity.set(entity)
	}

	const placeGeometryAtOrigin = async () => {
		const surfaceOpacity = plugin.isGeometryWireframe ? 0 : REFERENCE_GEOMETRY_OPACITY

		const entity = spawnGizmo(world, {
			kind: `reference ${plugin.geometryShape}`,
			traits: [
				plugin.geometryTrait,
				traits.Color(asRGB(REFERENCE_GEOMETRY_COLOR, { r: 0, g: 0, b: 0 })),
				traits.Opacity(surfaceOpacity),
			],
		})
		selectedEntity.set(entity)
	}
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
					disableTooltip={isGizmoMode}
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
							title="Reference plane"
							bind:expanded={() => openFolder === 'plane', (v) => setOpenFolder('plane', v)}
						>
							<List
								label="Type"
								options={planePlacements}
								value={plugin.planeConstruction}
								on:change={(event: ListChangeEvent) => {
									plugin.planeConstruction = event.detail.value as PlanePlacement
								}}
							/>
							<List
								label="Normal"
								options={axisOptions}
								value={plugin.planeAxis}
								on:change={(event: ListChangeEvent) => {
									plugin.planeAxis = event.detail.value as PlaneAxis
								}}
							/>
							{#if plugin.planeConstruction === 'offset'}
								<Slider
									label="Offset (mm)"
									value={plugin.planeOffset}
									min={-1000}
									max={1000}
									step={10}
									on:change={(event: SliderChangeEvent) => {
										plugin.planeOffset = event.detail.value
									}}
								/>
							{/if}
							<TPButton
								title="Place reference plane"
								on:click={() => {
									if (plugin.planeConstruction === 'free') pick('plane')
									else placePlaneAtOffset()
									close()
								}}
							/>
						</Folder>

						<Folder
							title="Reference geometry"
							bind:expanded={() => openFolder === 'geometry', (v) => setOpenFolder('geometry', v)}
						>
							<List
								label="Type"
								options={geometryPlacementOptions}
								value={plugin.geometryConstruction}
								on:change={(event: ListChangeEvent) => {
									plugin.geometryConstruction = event.detail.value as GeometryPlacement
								}}
							/>
							<List
								label="Shape"
								options={geometryShapeOptions}
								value={plugin.geometryShape}
								on:change={(event: ListChangeEvent) => {
									plugin.geometryShape = event.detail.value as GeometryShape
								}}
							/>
							<List
								label="Style"
								options={wireframeOptions}
								value={plugin.isGeometryWireframe}
								on:change={(event: ListChangeEvent) => {
									plugin.isGeometryWireframe = event.detail.value as boolean
								}}
							/>
							<TPButton
								title="Place reference geometry"
								on:click={() => {
									if (plugin.geometryConstruction === 'free') pick('geometry')
									else placeGeometryAtOrigin()
									close()
								}}
							/>
						</Folder>

						<Folder
							title="Polyline"
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
							<List
								label="Measure"
								options={lineMeasureOptions}
								value={plugin.lineMeasure}
								on:change={(event: ListChangeEvent) => {
									plugin.lineMeasure = event.detail.value as LineMeasure
								}}
							/>
							<TPButton
								title="Place polyline"
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
								label="Initial axis"
								options={arrowAxisOptions}
								value={plugin.arrowAxis}
								on:change={(event: ListChangeEvent) => {
									plugin.arrowAxis = event.detail.value as ArrowAxis
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

						<Folder
							title="Vertex normals"
							bind:expanded={
								() => openFolder === 'vertex-normals', (v) => setOpenFolder('vertex-normals', v)
							}
						>
							<Slider
								label="Length (mm)"
								value={plugin.vertexNormalsLength}
								min={10}
								max={500}
								step={10}
								on:change={(event: SliderChangeEvent) => {
									plugin.vertexNormalsLength = event.detail.value
								}}
							/>
							<TPButton
								title="Place vertex normals"
								on:click={() => {
									pick('vertex-normals')
									close()
								}}
							/>
						</Folder>

						<Folder
							title="Surface normals"
							bind:expanded={
								() => openFolder === 'surface-normals', (v) => setOpenFolder('surface-normals', v)
							}
						>
							<Slider
								label="Length (mm)"
								value={plugin.surfaceNormalsLength}
								min={10}
								max={500}
								step={10}
								on:change={(event: SliderChangeEvent) => {
									plugin.surfaceNormalsLength = event.detail.value
								}}
							/>
							<TPButton
								title="Place surface normals"
								on:click={() => {
									pick('surface-normals')
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
	{:else if plugin.mode === 'plane'}
		<PlaneTool />
	{:else if plugin.mode === 'geometry'}
		<GeometryTool />
	{:else if plugin.mode === 'line'}
		<LineTool />
	{:else if plugin.mode === 'arrow'}
		<ArrowTool />
	{:else if plugin.mode === 'vertex-normals'}
		<VertexNormalsTool />
	{:else if plugin.mode === 'surface-normals'}
		<SurfaceNormalsTool />
	{/if}
{/if}

<PolylineMeasureRenderer />
<VertexNormalsRenderer />
<SurfaceNormalsRenderer />

<GizmoDetails />
