let movingFrame = $state<string | undefined>(undefined)

/**
 * The single frame whose move is currently running, across every open panel.
 *
 * Shaped as a module-level singleton to match `moveGizmoOwner`, its twin: both arbitrate one
 * resource among panels that know nothing about each other. Context would not fit — there is no
 * subtree to scope to, since the contention is precisely between siblings, so a provider would be
 * this with a mount point bolted on.
 *
 * `client.move` needs no such thing: `builtIn.Move` opens with
 * `operation.CancelOtherWithLabel(ctx, builtinOpLabel)`, so a second move cancels the first inside
 * RDK (`services/motion/builtin/builtin.go:243`). `builtIn.DoCommand` does neither — it takes only a
 * read lock and carries no operation label — so the `execute` this panel sends is mutually exclusive
 * with nothing on the server. Two panels executing at once would batch `GoToInputs` for the same arm
 * from two different trajectories.
 *
 * Move mode renders a panel per selected frame and the execute buttons are not gated on owning the
 * gizmo, so two panels really can reach that state: select an arm and a gripper mounted on it,
 * preview both, execute both. The interlock has to live here because the server cannot supply it.
 *
 * A frame, not a boolean, so a panel can tell "I am the one moving" from "someone else is" — the
 * first shows progress, the second disables.
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
