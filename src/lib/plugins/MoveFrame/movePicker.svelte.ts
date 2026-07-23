let armedFrame = $state<string | undefined>(undefined)

export const movePicker = {
	get armedFrame() {
		return armedFrame
	},
	arm(frame: string) {
		armedFrame = frame
	},
	disarm(frame: string) {
		if (armedFrame === frame) armedFrame = undefined
	},
}
