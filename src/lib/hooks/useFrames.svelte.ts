import { getContext, setContext, untrack } from 'svelte'
import type { Geometry, Pose } from '@viamrobotics/sdk'
import { useRobotClient, createRobotQuery, useMachineStatus } from '@viamrobotics/svelte-sdk'
import { useStaticGeometries } from '$lib/hooks/useStaticGeometries.svelte'
import { useShapes } from '$lib/hooks/useShapes.svelte'
import { useGeometries } from '$lib/hooks/useGeometries.svelte'
import { usePointClouds } from '$lib/hooks/usePointclouds.svelte'
import { createPose, createGeometry, object3dToPose } from '$lib/transform'

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
	const query = createRobotQuery(client, 'frameSystemConfig')

	const machineStatus = useMachineStatus(partID)
	const revision = $derived(machineStatus.current?.config.revision)

	$effect(() => {
		revision
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
				const pose = createPose()
				object3dToPose(points, pose)
				return {
					name: points.name,
					parent: points.userData.parent ?? 'world',
					geometry: createGeometry(),
					pose,
				} satisfies Frame
			})
	)

	const clouds2 = $derived(
		shapes.points.map((points) => {
			const pose = createPose()
			object3dToPose(points, pose)

			return {
				name: points.name,
				parent: 'world',
				geometry: createGeometry(),
				pose,
			} satisfies Frame
		})
	)

	const meshes = $derived(
		shapes.meshes.map((mesh) => {
			const pose = createPose()
			object3dToPose(mesh, pose)

			return {
				name: mesh.name,
				parent: 'world',
				geometry: createGeometry(),
				pose,
			} satisfies Frame
		})
	)

	const poses = $derived(
		shapes.poses.map((arrow) => {
			return {
				name: arrow.name,
				parent: 'world',
				geometry: createGeometry(),
				pose: arrow.userData.pose,
			}
		})
	)

	const allGeometries = $derived(geometries.current.flatMap((query) => query.data ?? []))

	const allFrames = $derived([
		...frames.current,
		...statics.current.map((mesh) => {
			return {
				name: mesh.name,
				parent: 'world',
				geometry: mesh.userData.geometry,
				pose: mesh.userData.pose,
			}
		}),
		...shapes.current.map((shape) => {
			return {
				name: shape.name,
				parent: 'world',
				geometry: shape.userData.geometry,
				pose: shape.userData.pose,
			} satisfies Frame
		}),
		...shapes.models.map((model) => {
			return {
				name: model.name,
				parent: 'world',
				pose: model.userData.pose,
			} satisfies Frame
		}),
		...allGeometries,
		...clouds1,
		...clouds2,
		...meshes,
		...poses,
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
