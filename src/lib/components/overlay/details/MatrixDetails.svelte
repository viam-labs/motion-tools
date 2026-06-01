<script
	module
	lang="ts"
>
	import { Euler, MathUtils, Quaternion } from 'three'

	import { OrientationVector } from '$lib/three/OrientationVector'

	const quaternion = new Quaternion()
	const ov = new OrientationVector()
	const euler = new Euler()
</script>

<script lang="ts">
	import type { Pose } from '@viamrobotics/sdk'
	import type { Entity } from 'koota'

	import { useThrelte } from '@threlte/core'
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
		TabGroup,
		TabPage,
	} from 'svelte-tweakpane-ui'

	import { hierarchy, traits, useParentName, useQuery, useTrait } from '$lib/ecs'
	import { createPose, matrixToPose } from '$lib/transform'

	interface Props {
		entity: Entity
	}

	let { entity }: Props = $props()

	const { invalidate } = useThrelte()

	const matrix = useTrait(() => entity, traits.Matrix)
	const editedMatrix = useTrait(() => entity, traits.EditedMatrix)
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)
	const center = useTrait(() => entity, traits.Center)
	const parent = useParentName(() => entity)
	const namedEntities = useQuery(traits.Name)

	const parentOptions = $derived.by(() => {
		const opts = [{ value: 'world', text: 'world' }]
		for (const candidate of namedEntities.current) {
			if (candidate === entity) continue
			const candidateName = candidate.get(traits.Name)
			if (!candidateName || candidateName === 'world') continue
			opts.push({ value: candidateName, text: candidateName })
		}
		return opts
	})

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

	const applyLocal = (patch: Partial<Pose>) => {
		traits.writeMatrix(entity, patch)
		invalidate()
	}

	const handlePositionChange = (event: PointChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const next = event.detail.value as PointValue3dObject
		applyLocal({ x: next.x, y: next.y, z: next.z })
	}

	const handleOrientationOVChange = (event: PointChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const next = event.detail.value as PointValue4dObject
		applyLocal({ oX: next.x, oY: next.y, oZ: next.z, theta: next.w })
	}

	const handleParentChange = (event: ListChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const value = event.detail.value as string
		if (value === parent.current) return
		hierarchy.setParent(entity, value)
		invalidate()
	}

	const handleOrientationEulerChange = (event: RotationEulerChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const next = event.detail.value as RotationEulerValueObject
		euler.set(
			MathUtils.degToRad(next.x),
			MathUtils.degToRad(next.y),
			MathUtils.degToRad(next.z),
			'ZYX'
		)
		quaternion.setFromEuler(euler)
		ov.setFromQuaternion(quaternion)
		applyLocal({ oX: ov.x, oY: ov.y, oZ: ov.z, theta: MathUtils.radToDeg(ov.th) })
	}
</script>

<div class="flex flex-col gap-2.5 text-xs">
	<div>
		<strong class="font-semibold">parent</strong>
		{#key entity}
			<div aria-label="mutable parent">
				<List
					options={parentOptions}
					value={parent.current ?? 'world'}
					on:change={handleParentChange}
				/>
			</div>
		{/key}
	</div>

	<div>
		<strong class="font-semibold">world position</strong>
		<span class="text-subtle-2">(mm)</span>
		<div class="flex gap-3">
			<div><span class="text-subtle-2">x</span> {(worldPose?.x ?? 0).toFixed(2)}</div>
			<div><span class="text-subtle-2">y</span> {(worldPose?.y ?? 0).toFixed(2)}</div>
			<div><span class="text-subtle-2">z</span> {(worldPose?.z ?? 0).toFixed(2)}</div>
		</div>
	</div>

	<div>
		<strong class="font-semibold">world orientation</strong>
		<span class="text-subtle-2">(deg)</span>
		<div class="flex gap-3">
			<div><span class="text-subtle-2">x</span> {(worldPose?.oX ?? 0).toFixed(2)}</div>
			<div><span class="text-subtle-2">y</span> {(worldPose?.oY ?? 0).toFixed(2)}</div>
			<div><span class="text-subtle-2">z</span> {(worldPose?.oZ ?? 0).toFixed(2)}</div>
			<div><span class="text-subtle-2">th</span> {(worldPose?.theta ?? 0).toFixed(2)}</div>
		</div>
	</div>

	{#if localPose}
		<div>
			<strong class="font-semibold">local position</strong>
			<span class="text-subtle-2">(mm)</span>
			<div aria-label="mutable local position">
				<Point
					value={{ x: localPose.x, y: localPose.y, z: localPose.z }}
					on:change={handlePositionChange}
				/>
			</div>
		</div>

		<div>
			<strong class="font-semibold">local orientation</strong>
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
		</div>
	{/if}
</div>
