<script lang="ts">
	import { T, type Props as ThrelteProps } from '@threlte/core'
	import { AxesHelper } from '../three/AxesHelper'
	import { meshBounds } from '@threlte/extras'
	interface Props extends ThrelteProps<AxesHelper> {
		size?: number
		thickness?: number
	}

	let { size, thickness, ...rest }: Props = $props()
</script>

<T
	is={new AxesHelper(size, thickness)}
	raycast={meshBounds}
	{...rest}
/>
