<script
	module
	lang="ts"
>
	import { BufferAttribute, Euler, MathUtils, Quaternion } from 'three'

	import { OrientationVector } from '$lib/three/OrientationVector'

	const quaternion = new Quaternion()
	const ov = new OrientationVector()
	const euler = new Euler()
</script>

<script lang="ts">
	import type { Pose } from '@viamrobotics/sdk'
	import type { Snippet } from 'svelte'
	import type { HTMLAttributes } from 'svelte/elements'

	import { draggable } from '@neodrag/svelte'
	import { isInstanceOf, useThrelte } from '@threlte/core'
	import { PortalTarget } from '@threlte/extras'
	import { Button, Icon, Tooltip } from '@viamrobotics/prime-core'
	import { type Entity } from 'koota'
	import { Check, Copy } from 'lucide-svelte'
	import {
		List,
		type ListChangeEvent,
		Point,
		type PointChangeEvent,
		type PointValue3dObject,
		type PointValue4dObject,
		RotationEuler,
		type RotationEulerChangeEvent,
		type RotationEulerValueObject,
		Slider,
		type SliderChangeEvent,
		TabGroup,
		TabPage,
	} from 'svelte-tweakpane-ui'

	import AddRelationship from '$lib/components/overlay/AddRelationship.svelte'
	import AxesHelperDetails from '$lib/components/overlay/details/AxesHelperDetails.svelte'
	import OpacityDetails from '$lib/components/overlay/details/OpacityDetails.svelte'
	import { hierarchy, relations, traits, useParentName, useTag, useTrait, useWorld } from '$lib/ecs'
	import { FrameConfigUpdater } from '$lib/FrameConfigUpdater.svelte'
	import { useConfigFrames } from '$lib/hooks/useConfigFrames.svelte'
	import { useCameraControls } from '$lib/hooks/useControls.svelte'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { useFragmentInfo } from '$lib/hooks/useFragmentInfo.svelte'
	import { useLinkedEntities } from '$lib/hooks/useLinked.svelte'
	import { usePartConfig } from '$lib/hooks/usePartConfig.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useResourceByName } from '$lib/hooks/useResourceByName.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import { createPose, matrixToPose } from '$lib/transform'

	import ColorDetails from './details/ColorDetails.svelte'

	interface Props extends HTMLAttributes<HTMLDivElement> {
		entity: Entity
		details?: Snippet<[{ entity: Entity }]>
	}

	const { entity, details, ...rest }: Props = $props()

	const world = useWorld()
	const { scene } = useThrelte()
	const controls = useCameraControls()
	const resourceByName = useResourceByName()
	const configFrames = useConfigFrames()
	const partConfig = usePartConfig()
	const fragmentInfo = useFragmentInfo()
	const partID = usePartID()
	const settings = useSettings()
	const environment = useEnvironment()
	const linkedEntities = useLinkedEntities()

	const object3d = $derived(scene.getObjectByName(entity as unknown as string))

	const name = useTrait(() => entity, traits.Name)
	const parent = useParentName(() => entity)
	const matrix = useTrait(() => entity, traits.Matrix)
	const editedMatrix = useTrait(() => entity, traits.EditedMatrix)
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)
	const center = useTrait(() => entity, traits.Center)
	const box = useTrait(() => entity, traits.Box)
	const sphere = useTrait(() => entity, traits.Sphere)
	const capsule = useTrait(() => entity, traits.Capsule)
	const bufferGeometry = useTrait(() => entity, traits.BufferGeometry)
	const removable = useTrait(() => entity, traits.Removable)
	const points = useTrait(() => entity, traits.Points)
	const arrows = useTrait(() => entity, traits.Arrows)
	const framesAPI = useTrait(() => entity, traits.FramesAPI)
	const geometriesAPI = useTrait(() => entity, traits.GeometriesAPI)
	const customDetails = useTag(() => entity, traits.CustomDetails)

	const localPose = $derived.by<Pose | undefined>(() => {
		const source = editedMatrix.current ?? matrix.current
		if (source) return matrixToPose(source, createPose())
		if (center.current) return createPose(center.current)
		return undefined
	})
	const worldPose = $derived.by<Pose | undefined>(() => {
		if (!worldMatrix.current) return

		return matrixToPose(worldMatrix.current, createPose())
	})

	const triangleCount = $derived.by(() => {
		const geometry = bufferGeometry.current
		// Triangle count is meaningful only for meshes, not point clouds.
		if (!geometry || points.current) return
		const index = geometry.getIndex()
		const vertices = index ? index.count : (geometry.getAttribute('position')?.count ?? 0)
		return Math.floor(vertices / 3)
	})

	const isFrameNode = $derived(!!framesAPI.current)
	const isGeometry = $derived(!!geometriesAPI.current)
	const isFragmentComponentWithVariables = $derived(
		name.current && Object.keys(fragmentInfo.current?.[name.current]?.variables ?? {}).length > 0
	)
	const showEditFrameOptions = $derived(
		isFrameNode && partConfig.hasEditPermissions && !isFragmentComponentWithVariables
	)
	const showRelationshipOptions = $derived(points.current || arrows.current)
	const resourceName = $derived(name.current ? resourceByName.current[name.current] : undefined)
	const displayType = $derived(isFrameNode ? resourceName?.subtype : isGeometry ? 'geometry' : '')

	const geometryType = $derived.by(() => {
		if (box.current) return 'box'
		if (sphere.current) return 'sphere'
		if (capsule.current) return 'capsule'
		return 'none'
	})

	const geometryTypes = ['none', 'box', 'sphere', 'capsule'] as const

	let geometryTabIndex = $derived(geometryTypes.indexOf(geometryType))

	$effect(() => {
		const nextType = geometryTypes[geometryTabIndex]

		/**
		 * geometryTabIndex is derived from the entity's geometry traits, so on
		 * selection (or any trait-driven recompute) nextType already equals
		 * geometryType — firing then would call updateFrame, dirtying the part
		 * config and resetting the geometry to default dimensions. Only a user
		 * tab pick sets geometryTabIndex ahead of the trait, so guard on the two
		 * differing to fire solely for user-initiated changes.
		 */
		if (nextType === geometryType) return

		detailConfigUpdater.setGeometryType(entity, nextType)
	})

	let copied = $state(false)
	let dragElement = $state.raw<HTMLElement>()

	const eulerValue = $derived.by<RotationEulerValueObject>(() => {
		if (!localPose) return { x: 0, y: 0, z: 0 }
		ov.set(localPose.oX, localPose.oY, localPose.oZ, MathUtils.degToRad(localPose.theta))
		ov.toEuler(euler)
		return {
			x: MathUtils.radToDeg(euler.x),
			y: MathUtils.radToDeg(euler.y),
			z: MathUtils.radToDeg(euler.z),
		}
	})

	const detailConfigUpdater = new FrameConfigUpdater(partConfig.updateFrame, partConfig.deleteFrame)

	const stopKeyboardPropagation = (event: KeyboardEvent) => {
		event.stopPropagation()
	}

	const handlePositionChange = (event: PointChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		const next = event.detail.value as PointValue3dObject
		detailConfigUpdater.updateLocalPosition(entity, next)
	}

	const handleOrientationOVChange = (event: PointChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		const next = event.detail.value as PointValue4dObject
		detailConfigUpdater.updateLocalOrientation(entity, {
			oX: next.x,
			oY: next.y,
			oZ: next.z,
			theta: next.w,
		})
	}

	const handleOrientationEulerChange = (event: RotationEulerChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		const next = event.detail.value as RotationEulerValueObject
		euler.set(
			MathUtils.degToRad(next.x),
			MathUtils.degToRad(next.y),
			MathUtils.degToRad(next.z),
			'ZYX'
		)
		quaternion.setFromEuler(euler)
		ov.setFromQuaternion(quaternion)
		detailConfigUpdater.updateLocalOrientation(entity, {
			oX: ov.x,
			oY: ov.y,
			oZ: ov.z,
			theta: MathUtils.radToDeg(ov.th),
		})
	}

	const handleBoxChange = (event: PointChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		const next = event.detail.value as PointValue3dObject
		detailConfigUpdater.updateGeometry(entity, {
			type: 'box',
			x: next.x,
			y: next.y,
			z: next.z,
		})
	}

	const handleSphereRChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		detailConfigUpdater.updateGeometry(entity, { type: 'sphere', r: event.detail.value })
	}

	const handleCapsuleRChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		detailConfigUpdater.updateGeometry(entity, { type: 'capsule', r: event.detail.value })
	}

	const handleCapsuleLChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		detailConfigUpdater.updateGeometry(entity, { type: 'capsule', l: event.detail.value })
	}

	const handleParentChange = (event: ListChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		const value = event.detail.value as string
		if (value === parent.current) return
		hierarchy.setParent(entity, value)
		detailConfigUpdater.setFrameParent(entity, value)
	}

	const getCopyClipboardText = () => {
		return JSON.stringify(
			{
				worldPosition: worldPose ? { x: worldPose.x, y: worldPose.y, z: worldPose.z } : null,
				worldOrientation: worldPose
					? {
							x: worldPose.oX,
							y: worldPose.oY,
							z: worldPose.oZ,
							th: MathUtils.degToRad(worldPose.theta),
						}
					: null,
				localPosition: {
					x: localPose?.x,
					y: localPose?.y,
					z: localPose?.z,
				},
				localOrientation: {
					x: localPose?.oX,
					y: localPose?.oY,
					z: localPose?.oZ,
					th: localPose?.theta,
				},
				geometry: {
					type: geometryType,
					value: box.current ?? capsule.current ?? sphere.current,
				},
				parentFrame: parent.current ?? 'world',
			},
			null,
			2
		)
	}
</script>

{#snippet ImmutableField({
	label,
	value,
	ariaLabel,
}: {
	label?: string
	value?: number | string
	ariaLabel: string
})}
	<div>
		<span
			class="text-subtle-2"
			aria-label={`immutable ${ariaLabel}`}
		>
			{label}
		</span>

		{typeof value === 'number' ? value.toFixed(2) : (value ?? '-')}
	</div>
{/snippet}

{#if entity}
	<!-- tabindex makes the whole panel focusable so a click anywhere in it (not
	just the inputs) raises it via `focus-within:z-5`. -->
	<div
		id="details-panel"
		class="border-medium bg-extralight absolute top-0 right-0 z-4 m-2 w-70 border p-2 text-xs focus-within:z-5"
		role="region"
		aria-label="Details panel"
		tabindex="-1"
		onkeydown={stopKeyboardPropagation}
		onkeyup={stopKeyboardPropagation}
		use:draggable={{
			bounds: 'body',
			handle: dragElement,
		}}
		{...rest}
	>
		<div
			class="flex cursor-move items-center justify-between gap-2 pb-2"
			bind:this={dragElement}
		>
			<div class="flex w-[90%] items-center gap-1">
				<PortalTarget id="details-header-icon" />
				<strong class="overflow-hidden text-nowrap text-ellipsis">{name.current}</strong>
				<span class="text-subtle-2">{displayType}</span>
			</div>

			{#if object3d}
				<Tooltip
					let:tooltipID
					location="bottom"
				>
					<button
						class="text-subtle-2"
						aria-describedby={tooltipID}
						onclick={() => {
							const padding = 0.4

							const currentControls = controls.current

							if (!currentControls || !('fitToBox' in currentControls)) return

							const { azimuthAngle, polarAngle } = currentControls

							currentControls.fitToBox(object3d, true, {
								paddingTop: padding,
								paddingBottom: padding,
								paddingLeft: padding,
								paddingRight: padding,
							})

							// Preserve previous rotation
							currentControls.rotateAzimuthTo(azimuthAngle, true)
							currentControls.rotatePolarTo(polarAngle, true)
						}}
					>
						<Icon name="image-filter-center-focus" />
					</button>
					<p slot="description">Zoom to object</p>
				</Tooltip>
			{/if}

			{#if name.current}
				<Tooltip
					let:tooltipID
					location="bottom"
				>
					<button
						class="text-subtle-2"
						aria-describedby={tooltipID}
						aria-label="Open view from this frame"
						onclick={() => {
							const frameName = name.current
							if (!frameName) return
							const list = settings.current.openFramePovWidgets[partID.current] ?? []
							if (list.includes(frameName)) return
							settings.current.openFramePovWidgets = {
								...settings.current.openFramePovWidgets,
								[partID.current]: [...list, frameName],
							}
						}}
					>
						<Icon name="camera-outline" />
					</button>
					<p slot="description">View from this frame</p>
				</Tooltip>
			{/if}

			{#if removable.current}
				<Tooltip
					let:tooltipID
					location="bottom"
				>
					<button
						class="text-subtle-2"
						aria-describedby={tooltipID}
						onclick={() => {
							if (world.has(entity)) {
								entity.destroy()
							}
						}}
					>
						<Icon name="trash-can-outline" />
					</button>
					<p slot="description">Remove from scene</p>
				</Tooltip>
			{/if}

			<Tooltip
				let:tooltipID
				location="bottom"
			>
				<button
					class="text-subtle-2"
					aria-describedby={tooltipID}
					onclick={async () => {
						try {
							await navigator.clipboard.writeText(getCopyClipboardText())
						} catch {
							// clipboard unavailable (non-secure context or permission denied)
						}
						copied = true
						setTimeout(() => (copied = false), 1000)
					}}
				>
					{#if copied}
						<Check size={14} />
					{:else}
						<Copy size={14} />
					{/if}
				</button>
				<p slot="description">Copy details to clipboard</p>
			</Tooltip>
		</div>

		<div class="border-medium -mx-2 w-[100%+0.5rem] border-b"></div>

		{#if isFragmentComponentWithVariables}
			<p
				class="mt-2 rounded border-l-4 border-yellow-600 bg-yellow-50 px-2 py-1.5 text-yellow-900"
				data-testid="fragment-variables-warning"
				role="status"
			>
				This component is from a fragment with variables, editing frames in 3D scene is disabled
			</p>
		{/if}

		<h3
			class="text-subtle-2 pt-3 pb-2"
			data-testid="details-header"
		>
			Details
		</h3>

		<div class="flex flex-col gap-2.5">
			{#if !customDetails.current}
				<div>
					<strong class="font-semibold">world position</strong>
					<span class="text-subtle-2">(mm)</span>

					<div class="flex gap-3">
						<div>
							<span class="text-subtle-2">x</span>
							{(worldPose?.x ?? 0).toFixed(2)}
						</div>
						<div>
							<span class="text-subtle-2">y</span>
							{(worldPose?.y ?? 0).toFixed(2)}
						</div>
						<div>
							<span class="text-subtle-2">z</span>
							{(worldPose?.z ?? 0).toFixed(2)}
						</div>
					</div>
				</div>

				<div>
					<strong class="font-semibold">world orientation</strong>
					<span class="text-subtle-2">(deg)</span>
					<div class="flex gap-3">
						<div>
							<span class="text-subtle-2">x</span>
							{(worldPose?.oX ?? 0).toFixed(2)}
						</div>
						<div>
							<span class="text-subtle-2">y</span>
							{(worldPose?.oY ?? 0).toFixed(2)}
						</div>
						<div>
							<span class="text-subtle-2">z</span>
							{(worldPose?.oZ ?? 0).toFixed(2)}
						</div>
						<div>
							<span class="text-subtle-2">th</span>
							{(worldPose?.theta ?? 0).toFixed(2)}
						</div>
					</div>
				</div>

				<div>
					<strong class="font-semibold">parent frame</strong>
					{#if showEditFrameOptions}
						<!--
						Remount on entity change. svelte-tweakpane-ui's List runs
						`listBlade.value = value` on the still-mounted blade before its
						`options` prop has propagated, so the new entity's parent name
						(absent from the previous entity's option set) hits Tweakpane's
						ListConstraint, snaps to the first option, and fires a change
						event that handleParentChange interprets as a user pick — silently
						reparenting the clicked frame.
					-->
						{#key entity}
							<div aria-label="mutable parent frame">
								<List
									options={configFrames.getParentFrameOptions(name.current ?? '') ?? []}
									value={parent.current ?? 'world'}
									on:change={handleParentChange}
								/>
							</div>
						{/key}
					{:else}
						<div class="mt-0.5 flex gap-3">
							{@render ImmutableField({
								ariaLabel: 'parent frame name',
								value: parent.current ?? 'world',
							})}
						</div>
					{/if}
				</div>

				{#if localPose}
					<div>
						<strong class="font-semibold">local position</strong>
						<span class="text-subtle-2">(mm)</span>

						{#if showEditFrameOptions}
							<div aria-label="mutable local position">
								<Point
									value={{
										x: localPose.x,
										y: localPose.y,
										z: localPose.z,
									}}
									on:change={handlePositionChange}
								/>
							</div>
						{:else}
							<div class="mt-0.5 flex gap-3">
								{@render ImmutableField({
									label: 'x',
									ariaLabel: 'local position x coordinate',
									value: localPose.x,
								})}
								{@render ImmutableField({
									label: 'y',
									ariaLabel: 'local position y coordinate',
									value: localPose.y,
								})}
								{@render ImmutableField({
									label: 'z',
									ariaLabel: 'local position z coordinate',
									value: localPose.z,
								})}
							</div>
						{/if}
					</div>

					<div>
						<strong class="font-semibold">local orientation</strong>

						{#if showEditFrameOptions}
							<div aria-label="mutable local orientation">
								<TabGroup>
									<TabPage title="OV (deg)">
										<Point
											value={{
												x: localPose.oX,
												y: localPose.oY,
												z: localPose.oZ,
												w: localPose.theta,
											}}
											on:change={handleOrientationOVChange}
										/>
									</TabPage>
									<TabPage title="Euler">
										<RotationEuler
											value={eulerValue}
											unit="deg"
											on:change={handleOrientationEulerChange}
										/>
									</TabPage>
								</TabGroup>
							</div>
						{:else}
							<div class="mt-0.5 flex gap-3">
								{@render ImmutableField({
									label: 'x',
									ariaLabel: 'local orientation x coordinate',
									value: localPose.oX,
								})}
								{@render ImmutableField({
									label: 'y',
									ariaLabel: 'local orientation y coordinate',
									value: localPose.oY,
								})}
								{@render ImmutableField({
									label: 'z',
									ariaLabel: 'local orientation z coordinate',
									value: localPose.oZ,
								})}
								{@render ImmutableField({
									label: 'th',
									ariaLabel: 'local orientation theta degrees',
									value: localPose.theta,
								})}
							</div>
						{/if}
					</div>
				{/if}
			{/if}

			{#if showEditFrameOptions}
				<div>
					<strong class="font-semibold">geometry</strong>
					<span class="text-subtle-2">(mm)</span>
					<div aria-label="mutable geometry">
						<TabGroup bind:selectedIndex={geometryTabIndex}>
							<TabPage title="None" />
							<TabPage title="Box">
								{#if box.current}
									<div aria-label="mutable box dimensions">
										<Point
											value={{
												x: box.current.x,
												y: box.current.y,
												z: box.current.z,
											}}
											min={0}
											on:change={handleBoxChange}
										/>
									</div>
								{/if}
							</TabPage>
							<TabPage title="Sphere">
								{#if sphere.current}
									<div aria-label="mutable sphere dimensions">
										<Slider
											label="r"
											value={sphere.current.r}
											min={0}
											on:change={handleSphereRChange}
										/>
									</div>
								{/if}
							</TabPage>
							<TabPage title="Capsule">
								{#if capsule.current}
									<div aria-label="mutable capsule dimensions">
										<Slider
											label="r"
											value={capsule.current.r}
											min={0}
											on:change={handleCapsuleRChange}
										/>
										<Slider
											label="l"
											value={capsule.current.l}
											min={0}
											on:change={handleCapsuleLChange}
										/>
									</div>
								{/if}
							</TabPage>
						</TabGroup>
					</div>
				</div>
			{:else if box.current}
				<div>
					<strong class="font-semibold">dimensions</strong>
					<span class="text-subtle-2">(box) (mm)</span>
					<div class="mt-0.5 flex items-center gap-2">
						{@render ImmutableField({
							label: 'x',
							ariaLabel: 'box dimensions x value input',
							value: box.current.x,
						})}
						{@render ImmutableField({
							label: 'y',
							ariaLabel: 'box dimensions y value input',
							value: box.current.y,
						})}
						{@render ImmutableField({
							label: 'z',
							ariaLabel: 'box dimensions z value input',
							value: box.current.z,
						})}
					</div>
				</div>
			{:else if capsule.current}
				<div>
					<strong class="font-semibold">dimensions</strong>
					<span class="text-subtle-2">(capsule) (mm)</span>
					<div class="mt-0.5 flex items-center gap-2">
						{@render ImmutableField({
							label: 'r',
							ariaLabel: 'capsule dimensions radius value input',
							value: capsule.current.r,
						})}
						{@render ImmutableField({
							label: 'l',
							ariaLabel: 'capsule dimensions length value input',
							value: capsule.current.l,
						})}
					</div>
				</div>
			{:else if sphere.current}
				<div>
					<strong class="font-semibold">dimensions (sphere)</strong>
					<div class="flex items-center gap-2">
						{@render ImmutableField({
							label: 'r',
							ariaLabel: 'sphere dimensions radius value',
							value: sphere.current.r,
						})}
					</div>
				</div>
			{/if}

			{#if isInstanceOf(object3d, 'Points')}
				<div>
					<strong class="font-semibold">points</strong>
					{@render ImmutableField({
						label: 'count',
						ariaLabel: 'points count',
						value: new Intl.NumberFormat().format(
							(object3d.geometry.getAttribute('position') as BufferAttribute).array.length / 3
						),
					})}
				</div>
			{/if}

			{#if triangleCount !== undefined}
				<div>
					<strong class="font-semibold">triangles</strong>
					{@render ImmutableField({
						label: 'count',
						ariaLabel: 'triangle count',
						value: new Intl.NumberFormat().format(triangleCount),
					})}
				</div>
			{/if}

			<PortalTarget id="details-extensions" />

			{#if !customDetails.current}
				<ColorDetails {entity} />
				<OpacityDetails {entity} />
				<AxesHelperDetails {entity} />
			{/if}
		</div>

		{#if linkedEntities.current.length > 0}
			<h3 class="text-subtle-2 pt-3 pb-2">Relationships</h3>

			<div class="mt-0.5 flex flex-col gap-1">
				<strong class="font-semibold">Linked entities</strong>
				{#each linkedEntities.current as linkedEntity (linkedEntity)}
					{@const linkedEntityName = linkedEntity.get(traits.Name)}
					{@const linkType = entity.get(relations.SubEntityLink(linkedEntity))?.type}
					<div class="flex items-center gap-1">
						<span class="text-primary">{linkedEntityName} ({linkType})</span>
						<Icon
							name="trash-can-outline"
							class="h-6 cursor-pointer px-2 py-1 text-xs text-red-500"
							onclick={() => entity.remove(relations.SubEntityLink(linkedEntity))}
						/>
					</div>
				{/each}
			</div>
		{/if}

		{@render details?.({ entity })}

		{#if showRelationshipOptions || (showEditFrameOptions && environment.current.isStandalone)}
			<h3 class="text-subtle-2 pt-3 pb-2">Actions</h3>
		{/if}

		{#if showRelationshipOptions}
			<AddRelationship {entity} />
		{/if}

		{#if showEditFrameOptions && environment.current.isStandalone}
			<Button
				variant="danger"
				class="mt-2 w-full"
				onclick={() => detailConfigUpdater.deleteFrame(entity)}
			>
				Delete frame
			</Button>
		{/if}
	</div>
{/if}

<style>
	:global(.tp-tabv_i) {
		display: none;
	}

	:global(.tp-lblv),
	:global(.tp-tbpv_c) {
		padding-left: 0 !important;
	}
</style>
