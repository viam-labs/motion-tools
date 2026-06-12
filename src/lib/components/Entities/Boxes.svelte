<!--
@component

Renders every entity with `Box` + `WorldMatrix` traits as one pair of
instanced draw calls (toon-shaded faces + edge lines) instead of a mesh
per box. Trait events are coalesced into a microtask flush, mirroring
the `WorldMatrix` system, so a burst of changes (one reconcile tick)
becomes a single batch of instance writes and one `invalidate()`.
-->
<script lang="ts">
	import type { Entity } from 'koota'

	import { createRadixSort, InstancedMesh2 } from '@three.ez/instanced-mesh'
	import { T, useThrelte } from '@threlte/core'
	import {
		BoxGeometry,
		Color,
		EdgesGeometry,
		LineBasicMaterial,
		Matrix4,
		MeshToonMaterial,
		Quaternion,
		Vector3,
	} from 'three'

	import { asColor } from '$lib/buffer'
	import { colors, darkenColor, subtypeToColor } from '$lib/color'
	import { traits, useWorld } from '$lib/ecs'
	import { useResourceByName } from '$lib/hooks/useResourceByName.svelte'

	const { invalidate, renderer } = useThrelte()
	const world = useWorld()
	const resourceByName = useResourceByName()

	/**
	 * Shared unit geometries — every instance references these and sets its
	 * dimensions through the per-instance matrix scale, so resizing never
	 * rebuilds GPU buffers.
	 */
	const unitBox = new BoxGeometry(1, 1, 1)
	const unitBoxEdges = new EdgesGeometry(unitBox, 0)

	/**
	 * Box meshes render transparent by default (`Opacity` trait absent → 0.7,
	 * depth write off — same as `Mesh.svelte`); per-instance alpha is written
	 * via `setOpacityAt`. The base color stays white so per-instance colors
	 * aren't tinted. Whole-object culling is disabled because the library
	 * culls per instance against a bounding sphere it derives from each
	 * instance matrix.
	 */
	const instancedBoxes = new InstancedMesh2(
		unitBox,
		new MeshToonMaterial({ transparent: true, depthWrite: false }),
		{ renderer }
	)
	instancedBoxes.sortObjects = true
	instancedBoxes.customSort = createRadixSort(instancedBoxes)
	instancedBoxes.frustumCulled = false

	const instancedBoxEdges = new InstancedMesh2(unitBoxEdges, new LineBasicMaterial(), {
		renderer,
	})
	instancedBoxEdges.frustumCulled = false

	/**
	 * `InstancedMesh2` extends `Mesh`, so on its own it would draw the edge
	 * geometry as triangles. Re-tagging the object makes the renderer emit
	 * `gl.LINES`; the library's instancing shader patch still applies because
	 * `LineBasicMaterial` compiles from the same chunk-based `basic` program
	 * its patched shader chunks target.
	 */
	Object.assign(instancedBoxEdges, { isMesh: false, isLine: true, isLineSegments: true })

	/**
	 * Instance ids per entity. Ids are valid for both meshes: the library
	 * recycles ids through a free list, and every add/remove below is mirrored
	 * to faces and edges, so the two free lists stay identical.
	 */
	const instanceIdByEntity = new Map<Entity, number>()

	const position = new Vector3()
	const quaternion = new Quaternion()
	const scale = new Vector3()
	const matrix = new Matrix4()
	const colorUtil = new Color()

	/**
	 * Decompose the entity's `WorldMatrix` into the shared temps and fold the
	 * box dimensions (mm → m) into its scale — the same composition the old
	 * per-entity path produced by nesting a dimension-scaled mesh inside a
	 * `WorldMatrix`-driven group.
	 */
	const composeInstanceMatrix = (
		box: { x: number; y: number; z: number },
		worldMatrix: Matrix4
	) => {
		worldMatrix.decompose(position, quaternion, scale)
		scale.x *= box.x * 0.001
		scale.y *= box.y * 0.001
		scale.z *= box.z * 0.001
		return matrix.compose(position, quaternion, scale)
	}

	/** Same resolution order as `Frame.svelte`. */
	const resolveColor = (entity: Entity): Color => {
		const vertexColors = entity.get(traits.Colors)
		if (vertexColors && vertexColors.length >= 3) {
			return asColor(vertexColors, colorUtil)
		}

		const color = entity.get(traits.Color)
		if (color) {
			return colorUtil.setRGB(color.r, color.g, color.b)
		}

		const subtype = resourceByName.current[entity.get(traits.Name) ?? '']?.subtype
		return subtypeToColor(subtype) ?? colorUtil.set(colors.default)
	}

	const writeAppearance = (entity: Entity, id: number) => {
		const color = resolveColor(entity)
		const visible = !entity.has(traits.InheritedInvisible)

		instancedBoxes.setColorAt(id, color)
		instancedBoxes.setOpacityAt(id, entity.get(traits.Opacity) ?? 0.7)
		instancedBoxes.setVisibilityAt(id, visible)

		instancedBoxEdges.setColorAt(id, darkenColor(color, 10))
		instancedBoxEdges.setVisibilityAt(id, visible)
	}

	const addInstance = (
		entity: Entity,
		box: { x: number; y: number; z: number },
		worldMatrix: Matrix4
	) => {
		composeInstanceMatrix(box, worldMatrix)

		let id = -1
		instancedBoxes.addInstances(1, (obj, index) => {
			id = index
			obj.position.copy(position)
			obj.quaternion.copy(quaternion)
			obj.scale.copy(scale)
		})
		instancedBoxEdges.addInstances(1, (obj) => {
			obj.position.copy(position)
			obj.quaternion.copy(quaternion)
			obj.scale.copy(scale)
		})

		instanceIdByEntity.set(entity, id)
		writeAppearance(entity, id)
	}

	const removeInstance = (entity: Entity, id: number) => {
		instanceIdByEntity.delete(entity)
		instancedBoxes.removeInstances(id)
		instancedBoxEdges.removeInstances(id)
	}

	/**
	 * Transform work (matrix/dimension changes, adds, removes) is tracked
	 * separately from appearance work (color/opacity/visibility) so a robot
	 * in motion only rewrites matrices, not the color texture.
	 */
	const dirtyTransform = new Set<Entity>()
	const dirtyAppearance = new Set<Entity>()
	let scheduled = false

	const flush = () => {
		if (dirtyTransform.size === 0 && dirtyAppearance.size === 0) {
			return
		}

		for (const entity of dirtyTransform) {
			const id = instanceIdByEntity.get(entity)
			const box = entity.isAlive() ? entity.get(traits.Box) : undefined
			const worldMatrix = entity.isAlive() ? entity.get(traits.WorldMatrix) : undefined

			if (box && worldMatrix) {
				if (id === undefined) {
					addInstance(entity, box, worldMatrix)
				} else {
					composeInstanceMatrix(box, worldMatrix)
					instancedBoxes.setMatrixAt(id, matrix)
					instancedBoxEdges.setMatrixAt(id, matrix)
				}
			} else if (id !== undefined) {
				removeInstance(entity, id)
			}
		}

		for (const entity of dirtyAppearance) {
			const id = instanceIdByEntity.get(entity)
			if (id !== undefined && entity.isAlive()) {
				writeAppearance(entity, id)
			}
		}

		dirtyTransform.clear()
		dirtyAppearance.clear()
		invalidate()
	}

	const schedule = () => {
		if (scheduled) return
		scheduled = true
		queueMicrotask(() => {
			scheduled = false
			flush()
		})
	}

	/**
	 * `WorldMatrix` changes fire for every entity on every kinematics tick —
	 * filter to box entities before touching the dirty sets. `instanceIdByEntity`
	 * catches entities whose `Box` trait was just removed.
	 */
	const enqueue = (dirty: Set<Entity>) => (entity: Entity) => {
		if (!entity.has(traits.Box) && !instanceIdByEntity.has(entity)) return
		dirty.add(entity)
		schedule()
	}

	const enqueueTransform = enqueue(dirtyTransform)
	const enqueueAppearance = enqueue(dirtyAppearance)

	$effect(() => {
		for (const entity of world.query(traits.Box)) {
			dirtyTransform.add(entity)
			dirtyAppearance.add(entity)
		}
		if (dirtyTransform.size > 0) schedule()

		const unsubs = [
			world.onAdd(traits.Box, enqueueTransform),
			world.onChange(traits.Box, enqueueTransform),
			world.onRemove(traits.Box, enqueueTransform),
			world.onAdd(traits.WorldMatrix, enqueueTransform),
			world.onChange(traits.WorldMatrix, enqueueTransform),
			world.onRemove(traits.WorldMatrix, enqueueTransform),
			world.onAdd(traits.Color, enqueueAppearance),
			world.onChange(traits.Color, enqueueAppearance),
			world.onRemove(traits.Color, enqueueAppearance),
			world.onChange(traits.Colors, enqueueAppearance),
			world.onAdd(traits.Opacity, enqueueAppearance),
			world.onChange(traits.Opacity, enqueueAppearance),
			world.onAdd(traits.InheritedInvisible, enqueueAppearance),
			world.onRemove(traits.InheritedInvisible, enqueueAppearance),
		]

		return () => {
			for (const unsub of unsubs) unsub()
			dirtyTransform.clear()
			dirtyAppearance.clear()
		}
	})
</script>

<T is={instancedBoxes} />
<T
	is={instancedBoxEdges}
	raycast={() => null}
/>
