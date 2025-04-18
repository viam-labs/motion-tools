import { getContext, setContext } from 'svelte'
import { useFrames } from './useFrames.svelte'
import { Object3D } from 'three'
import { useGeometries } from './useGeometries.svelte'
import { useStaticGeometries } from './useStaticGeometries.svelte'
import { useShapes } from './useShapes.svelte'
import { usePointClouds } from './usePointclouds.svelte'

const key = Symbol('objects-context')

export const provideObjects = () => {
	const frames = useFrames()
	const geometries = useGeometries()
	const statics = useStaticGeometries()
	const shapes = useShapes()
	const points = usePointClouds()

	const objects = $derived<Object3D[]>([
		...shapes.current,
		...shapes.meshes,
		...shapes.models,
		...shapes.nurbs,
		...shapes.points,
		...shapes.poses,
		...statics.current,
	])
}

export const useObjects = () => {}
