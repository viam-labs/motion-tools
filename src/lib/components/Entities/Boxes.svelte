<!--
@component

Renders every entity with `Box` + `WorldMatrix` traits as one pair of
instanced draw calls (toon-shaded faces + edge lines) instead of a mesh
per box. Trait events are coalesced into a microtask flush, mirroring
the `WorldMatrix` system, so a burst of changes (one reconcile tick)
becomes a single batch of instance writes and one `invalidate()`.

The faces mesh is also the pointer-interaction surface: `InstancedMesh2`
raycasts per instance (skipping invisible ones) and stamps `instanceId`
on each hit, which `useInstancedEntityEvents` maps back to the entity.
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
		Sphere,
		Vector3,
	} from 'three'

	import { asColor } from '$lib/buffer'
	import { colors, darkenColor, subtypeToColor } from '$lib/color'
	import { traits, useWorld } from '$lib/ecs'
	import { useResourceByName } from '$lib/hooks/useResourceByName.svelte'

	import { composeBoxMatrix } from './composeBoxMatrix'
	import { useInstancedEntityEvents } from './hooks/useEntityEvents.svelte'

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

	/**
	 * Keep raycasts on the library's linear (non-BVH) path, but neutralize
	 * its gate: the whole-object bounding sphere is computed once on the
	 * first raycast (usually before any boxes have streamed in) and never
	 * invalidated, leaving instances unhittable. Pin it open and let the
	 * per-instance early-outs do the pruning — for an always-animating
	 * scene this beats `computeBVH()`, which would re-insert every moving
	 * box into the tree on every kinematics tick.
	 */
	instancedBoxes.boundingSphere = new Sphere(new Vector3(), Infinity)

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
	 * Instance ids per entity, and the reverse for resolving raycast hits back
	 * to entities. Ids are valid for both meshes: the library recycles ids
	 * through a free list, and every add/remove below is mirrored to faces and
	 * edges, so the two free lists stay identical.
	 */
	const instanceIdByEntity = new Map<Entity, number>()
	const entityByInstanceId = new Map<number, Entity>()

	const events = useInstancedEntityEvents((event) =>
		event.instanceId === undefined ? undefined : entityByInstanceId.get(event.instanceId)
	)

	const position = new Vector3()
	const quaternion = new Quaternion()
	const scale = new Vector3()
	const matrix = new Matrix4()
	const colorUtil = new Color()

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

		/**
		 * Mirrors `useEntityEvents`' invisibility watcher: an instance that
		 * vanishes under a motionless cursor gets no pointerleave until the
		 * pointer moves, so drop its hover state here.
		 */
		if (!visible && entity.has(traits.Hovered)) {
			entity.remove(traits.Hovered)
		}
	}

	/** Caller composes the instance transform into `matrix` first. */
	const addInstance = (entity: Entity) => {
		matrix.decompose(position, quaternion, scale)

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
		entityByInstanceId.set(id, entity)
		writeAppearance(entity, id)
	}

	const removeInstance = (entity: Entity, id: number) => {
		instanceIdByEntity.delete(entity)
		entityByInstanceId.delete(id)
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

			if (entity.isAlive() && composeBoxMatrix(entity, matrix)) {
				if (id === undefined) {
					addInstance(entity)
				} else {
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
			world.onAdd(traits.Center, enqueueTransform),
			world.onChange(traits.Center, enqueueTransform),
			world.onRemove(traits.Center, enqueueTransform),

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

<T
	is={instancedBoxes}
	{...events}
/>

<T
	is={instancedBoxEdges}
	raycast={() => null}
/>
