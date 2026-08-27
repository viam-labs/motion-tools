<!--
@component

The light rig realistic mode replaces the flat toon rig with: one shadow-casting
key light, and ambient dialled back far enough that the environment map carries
the fill.

Mounting this component is what arms the renderer's shadow map. Three compiles
shadow code only once a light actually casts, so nothing pays for it in the other
modes, and the recompile the light itself forces covers the switch.
-->
<script lang="ts">
	import type { DirectionalLight } from 'three'

	import { T, useThrelte } from '@threlte/core'
	import { PCFSoftShadowMap } from 'three'

	const { renderer } = useThrelte()

	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = PCFSoftShadowMap

	/**
	 * The key light sits 3m out on each axis, so the shadow frustum is centred on the
	 * origin and sized to hold a workcell. Wider blurs an arm's own shadow away,
	 * narrower clips it.
	 */
	const SHADOW_EXTENT = 6
	const SHADOW_MAP_SIZE = 2048
	const SHADOW_CAMERA_NEAR = 0.1
	const SHADOW_CAMERA_FAR = 30

	/**
	 * Colliders draw at 0.7 opacity but cast at full strength, the depth pass carrying
	 * no alpha, so an undimmed shadow reads as a silhouette rather than as contact.
	 */
	const SHADOW_INTENSITY = 0.8

	/** Offsetting along the surface normal keeps shadow acne off the curved colliders. */
	const SHADOW_NORMAL_BIAS = 0.02

	const KEY_INTENSITY = 1.5
	const AMBIENT_INTENSITY = 0.5

	const configureShadow = ({ shadow }: DirectionalLight) => {
		shadow.mapSize.setScalar(SHADOW_MAP_SIZE)
		shadow.intensity = SHADOW_INTENSITY
		shadow.normalBias = SHADOW_NORMAL_BIAS
		shadow.camera.near = SHADOW_CAMERA_NEAR
		shadow.camera.far = SHADOW_CAMERA_FAR
		shadow.camera.left = -SHADOW_EXTENT
		shadow.camera.right = SHADOW_EXTENT
		shadow.camera.top = SHADOW_EXTENT
		shadow.camera.bottom = -SHADOW_EXTENT
		shadow.camera.updateProjectionMatrix()
	}
</script>

<T.DirectionalLight
	position={[3, 3, 3]}
	intensity={KEY_INTENSITY}
	castShadow
	oncreate={configureShadow}
/>

<T.AmbientLight intensity={AMBIENT_INTENSITY} />
