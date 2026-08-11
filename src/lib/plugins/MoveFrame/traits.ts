import { type Entity, trait } from 'koota'

/**
 * The component a preview ghost stands in for, by name. A ghost deliberately carries no `Name` and
 * no `ChildOf`, so its component name is the only thing left that can say which arm owns it.
 */
export const PreviewOf = trait(() => '')

/**
 * The component `entity` is a preview ghost of, or `undefined` when it carries none. `PreviewOf`'s
 * zero value is `''`, which reads the same as absent, so every call site normalizes through here.
 */
export const previewedComponent = (entity: Entity): string | undefined => {
	const value = entity.get(PreviewOf)
	return value === undefined || value === '' ? undefined : value
}

const ORIGIN_SUFFIX = '_origin'

/**
 * The component that owns a synthesized frame, which is what {@link PreviewOf} carries: `arm`,
 * `arm_origin` and `arm:wrist_1_link` all belong to `arm`.
 */
export const previewComponentName = (frameName: string): string => {
	// `_origin` is appended to a whole part name, so a name ending in it settles the question before
	// the colon rule below can read `myremote:arm_origin` as part `myremote`.
	if (frameName.endsWith(ORIGIN_SUFFIX)) return frameName.slice(0, -ORIGIN_SUFFIX.length)

	// Last colon, not first: `:` is RDK's remote delimiter as well as its link delimiter, so a remote
	// arm is `myremote:arm` with links `myremote:arm:wrist_1_link`, and remotes nest.
	const lastColon = frameName.lastIndexOf(':')
	return lastColon === -1 ? frameName : frameName.slice(0, lastColon)
}
