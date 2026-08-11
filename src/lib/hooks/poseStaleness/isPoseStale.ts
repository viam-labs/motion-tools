/** Grace period on top of the poll period, so a reconnect blip stays quiet. */
export const STALE_AFTER_MS = 2000

/** Epoch milliseconds, except `interval`. */
export interface PoseFreshness {
	now: number

	/** Latest successful pose across every frame; 0 before the first one. */
	lastPoseAt: number

	pollingStartedAt: number

	/** Poll period in ms. Zero or negative means polling is manual or off. */
	interval: number
}

/**
 * Whether the scene is drawing poses older than the poll rate can explain.
 * A gap, not an error: a dropped connection disables the pose queries rather
 * than failing them, and a hung `getPose` never errors.
 */
export const isPoseStale = ({
	now,
	lastPoseAt,
	pollingStartedAt,
	interval,
}: PoseFreshness): boolean =>
	// Floored by `pollingStartedAt` so a part that just connected, or was
	// revisited carrying a cached pose from its last session, isn't blamed.
	interval > 0 && now - Math.max(lastPoseAt, pollingStartedAt) > interval + STALE_AFTER_MS
