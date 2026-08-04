/** Returns configured frame names that do not yet have a registered pose query. */
export const missingPoseFrameNames = (
	expectedFrameNames: Iterable<string>,
	registeredFrameNames: Iterable<string>
): string[] => {
	const registered = new Set(registeredFrameNames)
	return [...new Set(expectedFrameNames)].filter((name) => !registered.has(name))
}
