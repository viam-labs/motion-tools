import { getContext, setContext } from 'svelte'
import { useFrames } from './useFrames.svelte'
import { useGeometries } from './useGeometries.svelte'
import { useStaticGeometries } from './useStaticGeometries.svelte'
import { useShapes } from './useShapes.svelte'
import { usePointClouds } from './usePointclouds.svelte'
import type { WorldObject } from '$lib/WorldObject'

const key = Symbol('objects-context')

interface Context {
	current: WorldObject[]
}

export const provideObjects = () => {
	const frames = useFrames()
	const geometries = useGeometries()
	const statics = useStaticGeometries()
	const shapes = useShapes()
	const points = usePointClouds()

	const objects = $derived<WorldObject[]>([
		...frames.current,
		...geometries.current,
		...points.current,
		...shapes.meshes,
		...shapes.models,
		...shapes.nurbs,
		...shapes.points,
		...statics.current,
		...shapes.poses,
	])

	setContext<Context>(key, {
		get current() {
			return objects
		},
	})
}

export const useObjects = (): Context => {
	return getContext<Context>(key)
}
