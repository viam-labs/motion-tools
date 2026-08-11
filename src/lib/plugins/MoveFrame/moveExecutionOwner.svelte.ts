let movingFrame = $state<string | undefined>(undefined)

/**
 * The single frame whose move is currently running, across every open panel. `execute` goes out over
 * `DoCommand`, which carries no operation label, so RDK cancels nothing between panels.
 */
export const moveExecutionOwner = {
	get movingFrame() {
		return movingFrame
	},
	/** Take the lock, or report that another panel holds it. */
	claim(frame: string): boolean {
		if (movingFrame !== undefined) return false
		movingFrame = frame
		return true
	},
	release(frame: string) {
		if (movingFrame === frame) movingFrame = undefined
	},
}
