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
	import { untrack } from 'svelte'
	import {
		Button,
		Folder,
		List,
		type ListChangeEvent,
		Pane,
		Separator,
		Slider,
		type SliderChangeEvent,
	} from 'svelte-tweakpane-ui'

	import { asRGB } from '$lib/buffer'
	import DashboardButton from '$lib/components/overlay/dashboard/Button.svelte'
	import Popover from '$lib/components/overlay/Popover.svelte'
	import { traits, useWorld } from '$lib/ecs'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import GizmoDetails from './GizmoDetails.svelte'
	import GizmoEntities from './GizmoEntities.svelte'
	import {
		type ArrowAxis,
		type GeometryPlacement,
		type GeometryShape,
		type GizmoMode,
		GizmoModes,
		type LineMeasure,
		type LineSpace,
		type PlaneAxis,
		type PlanePlacement,
	} from './gizmos'
	import { planeMatrix } from './matrix'
	import PolylineVertexEditor from './PolylineVertexEditor.svelte'
	import { selectOnly } from './selection'
	import { REFERENCE_GEOMETRY_COLOR, REFERENCE_GEOMETRY_OPACITY, spawnGizmo } from './spawn'
	import ArrowTool from './tools/ArrowTool.svelte'
	import CoordinateSystemTool from './tools/CoordinateSystemTool.svelte'
	import GeometryTool from './tools/GeometryTool.svelte'
	import LineTool from './tools/LineTool.svelte'
	import NormalsTool from './tools/NormalsTool.svelte'
	import PlaneTool from './tools/PlaneTool.svelte'
	import { ReferencePlane } from './traits'
	import { provideGizmos } from './useGizmos.svelte'
	import { provideSelectedPolylineVertex } from './useSelectedPolylineVertex.svelte'

	const settings = useSettings()
	const world = useWorld()
	const gizmos = provideGizmos(() => toggleOff())
	provideSelectedPolylineVertex()

	type FolderName = 'plane' | 'geometry' | 'line' | 'arrow' | 'vertex-normals' | 'surface-normals'
	let openFolder = $state<FolderName>()

	const isGizmoMode = $derived(settings.current.interactionMode === 'gizmo')
	$effect(() => {
		if (isGizmoMode) return
		untrack(() => {
			if (gizmos.mode !== 'idle') gizmos.mode = 'idle'
		})
	})

	const pick = (mode: GizmoMode) => {
		settings.current.interactionMode = 'gizmo'
		gizmos.mode = mode
	}

	const toggleOff = () => {
		settings.current.interactionMode = 'navigate'
		gizmos.mode = 'idle'
	}

	const setOpenFolder = (name: FolderName, expanded: boolean) => {
		if (expanded) openFolder = name
		else if (openFolder === name) openFolder = undefined
	}

	const placePlaneAtOffset = () => {
		const offsetMeters = gizmos.planeOffset * 0.001
		const position = gizmos.planeAxisVector.multiplyScalar(offsetMeters)
		const entity = spawnGizmo(world, {
			kind: 'reference plane',
			traits: [ReferencePlane, traits.Opacity(0.7)],
			matrix: planeMatrix(gizmos.planeAxis, position),
		})

		selectOnly(world, entity)
	}

	const placeGeometryAtOrigin = () => {
		const surfaceOpacity = gizmos.isGeometryWireframe ? 0 : REFERENCE_GEOMETRY_OPACITY

		const entity = spawnGizmo(world, {
			kind: `reference ${gizmos.geometryShape}`,
			traits: [
				gizmos.geometryTrait,
				traits.Color(asRGB(REFERENCE_GEOMETRY_COLOR, { r: 0, g: 0, b: 0 })),
				traits.Opacity(surfaceOpacity),
			],
		})
		selectOnly(world, entity)
	}
</script>

<Portal id="dashboard">
	<div class="relative">
		<Popover>
			{#snippet trigger(triggerProps, { isOpen })}
				<DashboardButton
					{...triggerProps}
					active={isGizmoMode || isOpen}
					icon="shapes"
					description={isGizmoMode ? `Gizmo: ${gizmos.mode}` : 'Add gizmo'}
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
						<Button
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
								value={gizmos.planeConstruction}
								on:change={(event: ListChangeEvent) => {
									gizmos.planeConstruction = event.detail.value as PlanePlacement
								}}
							/>
							<List
								label="Normal"
								options={axisOptions}
								value={gizmos.planeAxis}
								on:change={(event: ListChangeEvent) => {
									gizmos.planeAxis = event.detail.value as PlaneAxis
								}}
							/>
							{#if gizmos.planeConstruction === 'offset'}
								<Slider
									label="Offset (mm)"
									value={gizmos.planeOffset}
									min={-1000}
									max={1000}
									step={10}
									on:change={(event: SliderChangeEvent) => {
										gizmos.planeOffset = event.detail.value
									}}
								/>
							{/if}
							<Button
								title="Place reference plane"
								on:click={() => {
									if (gizmos.planeConstruction === 'free') pick(GizmoModes.ReferencePlane)
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
								value={gizmos.geometryConstruction}
								on:change={(event: ListChangeEvent) => {
									gizmos.geometryConstruction = event.detail.value as GeometryPlacement
								}}
							/>
							<List
								label="Shape"
								options={geometryShapeOptions}
								value={gizmos.geometryShape}
								on:change={(event: ListChangeEvent) => {
									gizmos.geometryShape = event.detail.value as GeometryShape
								}}
							/>
							<List
								label="Style"
								options={wireframeOptions}
								value={gizmos.isGeometryWireframe}
								on:change={(event: ListChangeEvent) => {
									gizmos.isGeometryWireframe = event.detail.value as boolean
								}}
							/>
							<Button
								title="Place reference geometry"
								on:click={() => {
									if (gizmos.geometryConstruction === 'free') pick(GizmoModes.ReferenceGeometry)
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
								value={gizmos.lineSpace}
								on:change={(event: ListChangeEvent) => {
									gizmos.lineSpace = event.detail.value as LineSpace
								}}
							/>
							<List
								label="Measure"
								options={lineMeasureOptions}
								value={gizmos.lineMeasure}
								on:change={(event: ListChangeEvent) => {
									gizmos.lineMeasure = event.detail.value as LineMeasure
								}}
							/>
							<Button
								title="Place polyline"
								on:click={() => {
									pick(GizmoModes.Polyline)
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
								value={gizmos.arrowAxis}
								on:change={(event: ListChangeEvent) => {
									gizmos.arrowAxis = event.detail.value as ArrowAxis
								}}
							/>
							<Button
								title="Place arrow"
								on:click={() => {
									pick(GizmoModes.Arrow)
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
								value={gizmos.vertexNormalsLength}
								min={10}
								max={500}
								step={10}
								on:change={(event: SliderChangeEvent) => {
									gizmos.vertexNormalsLength = event.detail.value
								}}
							/>
							<Button
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
								value={gizmos.surfaceNormalsLength}
								min={10}
								max={500}
								step={10}
								on:change={(event: SliderChangeEvent) => {
									gizmos.surfaceNormalsLength = event.detail.value
								}}
							/>
							<Button
								title="Place surface normals"
								on:click={() => {
									pick('surface-normals')
									close()
								}}
							/>
						</Folder>

						{#if isGizmoMode}
							<Separator />
							<Button
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
	</div>
</Portal>

{#if isGizmoMode}
	{#if gizmos.mode === GizmoModes.CoordinateSystem}
		<CoordinateSystemTool />
	{:else if gizmos.mode === GizmoModes.ReferencePlane}
		<PlaneTool />
	{:else if gizmos.mode === GizmoModes.ReferenceGeometry}
		<GeometryTool />
	{:else if gizmos.mode === GizmoModes.Polyline}
		<LineTool />
	{:else if gizmos.mode === GizmoModes.Arrow}
		<ArrowTool />
	{:else if gizmos.mode === GizmoModes.VertexNormals}
		<NormalsTool kind="vertex" />
	{:else if gizmos.mode === GizmoModes.SurfaceNormals}
		<NormalsTool kind="surface" />
	{/if}
{/if}

<GizmoEntities />

<PolylineVertexEditor />

{#if isGizmoMode}
	<GizmoDetails />
{/if}
