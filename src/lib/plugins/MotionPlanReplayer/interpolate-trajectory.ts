const INTERP_STEP_RAD = (5 * Math.PI) / 180 // 5° per sub-step

/**
 * Densify a trajectory by linearly interpolating between keyframes.
 *
 * Sub-step count between each pair is driven by the joint with the largest
 * angular change, so all joints move at uniform velocity relative to each other.
 */
export const interpolateTrajectory = (
	trajectory: Array<Record<string, number[]>>,
	stepRad = INTERP_STEP_RAD
): Array<Record<string, number[]>> => {
	if (trajectory.length < 2) return trajectory

	const result: Array<Record<string, number[]>> = []

	for (let i = 0; i < trajectory.length - 1; i++) {
		const from = trajectory[i]!
		const to = trajectory[i + 1]!

		let maxDelta = 0
		for (const [comp, fromAngles] of Object.entries(from)) {
			const toAngles = to[comp]
			if (!toAngles) continue
			for (let j = 0; j < fromAngles.length; j++) {
				maxDelta = Math.max(maxDelta, Math.abs((toAngles[j] ?? 0) - (fromAngles[j] ?? 0)))
			}
		}

		const numSubSteps = Math.max(1, Math.ceil(maxDelta / stepRad))

		for (let k = 0; k < numSubSteps; k++) {
			const t = k / numSubSteps
			const interpolated: Record<string, number[]> = {}
			for (const [comp, fromAngles] of Object.entries(from)) {
				const toAngles = to[comp] ?? fromAngles
				interpolated[comp] = fromAngles.map((a, j) => a + t * ((toAngles[j] ?? a) - a))
			}
			result.push(interpolated)
		}
	}

	result.push(trajectory.at(-1)!)
	return result
}
