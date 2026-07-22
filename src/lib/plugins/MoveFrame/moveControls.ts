import type { ResourceName, Transform } from '@viamrobotics/sdk'

/** Whether a resource is a motion service (`rdk:service:motion`). */
export const isMotionService = (resource: ResourceName): boolean =>
	resource.type === 'service' && resource.subtype === 'motion'

/** The motion service names on the machine, in discovery order. */
export const motionServiceNames = (resources: ResourceName[]): string[] =>
	resources.filter((element) => isMotionService(element)).map((resource) => resource.name)

/**
 * The motion service to select by default: the built-in service when present,
 * otherwise the first available, or `''` when the machine has none.
 */
export const defaultMotionService = (services: string[]): string =>
	services.find((name) => name === 'builtin') ?? services[0] ?? ''

/**
 * A frame's parent — the reference frame of the pose that positions it — or
 * `'world'` when it has no configured parent. Used as the default move destination
 * so the frame moves relative to what it is attached to.
 */
export const frameParent = (frames: Transform[], frameName: string): string =>
	frames.find((frame) => frame.referenceFrame === frameName)?.poseInObserverFrame?.referenceFrame ||
	'world'
