let transformControlsActive = $state(false)

const context = {
	get transformControlsActive() {
		return transformControlsActive
	},
	setTransformControlsActive(active: boolean) {
		transformControlsActive = active
	},
}

export let useControls = () => {
	return context
}
