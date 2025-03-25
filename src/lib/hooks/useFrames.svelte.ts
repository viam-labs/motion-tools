import type { Geometry, Pose } from '@viamrobotics/sdk'
import { useRobotClient, createRobotQuery } from '@viamrobotics/svelte-sdk'
import { OrientationVector } from '@viamrobotics/three'
import { getContext, setContext, untrack } from 'svelte'
import { useStaticGeometries } from '$lib/hooks/useStaticGeometries.svelte'
import { useShapes } from '$lib/hooks/useShapes.svelte'
import { useGeometries } from '$lib/hooks/useGeometries.svelte'
import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'
import { createPose, createGeometry } from '$lib/transform'

export interface Frame {
	name: string
	parent: string
	pose: Pose
	geometry: Geometry
}

interface FramesContext {
	current: Frame[]
	error?: Error
	fetching: boolean
}

interface AllFramesContext {
	current: Frame[]
}

const key = Symbol('frames-context')
const allFramesKey = Symbol('all-frames-context')

export const provideFrames = (partID: () => string) => {
	const client = useRobotClient(partID)
	const query = createRobotQuery(client, 'frameSystemConfig', { refetchInterval: 10_000 })

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		client.current
		untrack(() => query.current).refetch()
	})

	const current = $derived(
		(query.current.data ?? []).map((config) => {
			return {
				name: config.frame?.referenceFrame ?? '',
				parent: config.frame?.poseInObserverFrame?.referenceFrame ?? 'world',
				pose: config.frame?.poseInObserverFrame?.pose ?? createPose(),
				geometry: config.frame?.physicalObject ?? createGeometry(),
			}
		})
	)
	const error = $derived(query.current.error ?? undefined)
	const fetching = $derived(query.current.isFetching)

	setContext<FramesContext>(key, {
		get current() {
			return current
		},
		get error() {
			return error
		},
		get fetching() {
			return fetching
		},
	})

	const frames = useFrames()
	const geometries = useGeometries()
	const statics = useStaticGeometries()
	const shapes = useShapes()
	const pcds = usePointClouds()
	const clouds1 = $derived(
		pcds.current
			.map((query) => query.data)
			.filter((points) => points !== undefined)
			.map((points) => {
				const ov = new OrientationVector()
				ov.setFromQuaternion(points.quaternion)
				return {
					name: points.name,
					parent: points.userData.parent ?? 'world',
					geometry: createGeometry(),
					pose: {
						...points.position,
						oX: ov.x,
						oY: ov.y,
						oZ: ov.z,
						theta: ov.th,
					},
				} satisfies Frame
			})
	)
	const clouds2 = $derived(
		shapes.points.map((points) => {
			return {
				name: points.name,
				parent: 'world',
				geometry: createGeometry(),
				pose: createPose(),
			} satisfies Frame
		})
	)
	const meshes = $derived(
		shapes.meshes.map((mesh) => {
			return {
				name: mesh.name,
				parent: 'world',
				geometry: createGeometry(),
				pose: createPose({ ...mesh.position }),
			} satisfies Frame
		})
	)
	const allGeometries = $derived(geometries.current.flatMap((query) => query.data ?? []))
	const allFrames = $derived([
		...frames.current,
		...statics.current,
		...shapes.current,
		...allGeometries,
		...clouds1,
		...clouds2,
		...meshes,
	])

	setContext<AllFramesContext>(allFramesKey, {
		get current() {
			return allFrames
		},
	})
}

export const useFrames = (): FramesContext => {
	return getContext<FramesContext>(key)
}

export const useAllFrames = (): AllFramesContext => {
	return getContext<AllFramesContext>(allFramesKey)
}
