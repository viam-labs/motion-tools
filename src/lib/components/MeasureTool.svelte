<script lang="ts">
	import { untrack } from 'svelte'
	import { Raycaster, Vector2, Vector3, type Intersection } from 'three'
	import { T, useThrelte, useTask } from '@threlte/core'
	import { HTML, MeshLineGeometry, MeshLineMaterial, useInteractivity } from '@threlte/extras'
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import Button from './dashboard/Button.svelte'
	import Portal from './portal/Portal.svelte'
	import DotSprite from './DotSprite.svelte'

	const settings = useSettings()
	const { camera } = useThrelte()
	const interactivity = useInteractivity()
	const raycaster = new Raycaster()

	const htmlPosition = new Vector3()
	const pointerDown = new Vector2()
	const pointerUp = new Vector2()

	let step: 'idle' | 'p1' | 'p2' = 'idle'

	let intersection: Intersection | undefined
	let p1 = $state.raw<Vector3>()
	let p2 = $state.raw<Vector3>()

	const enabled = $derived(settings.current.enableMeasure)

	const onpointerdown = (event: PointerEvent) => {
		pointerDown.set(event.clientX, event.clientY)
	}

	const onpointerup = (event: PointerEvent) => {
		pointerUp.set(event.clientX, event.clientY)

		if (pointerDown.distanceToSquared(pointerUp) > 0.1) {
			return
		}

		if (step === 'idle' && intersection) {
			p1 = intersection.point.clone()
			step = 'p1'
		} else if (step === 'p1' && intersection) {
			p2 = intersection.point.clone()
			step = 'p2'
		} else if (step === 'p2') {
			p1 = undefined
			p2 = undefined
			step = 'idle'
		}
	}

	const { start, stop } = useTask(
		() => {
			if (interactivity.hovered.size === 0) {
				return
			}

			for (const [, event] of interactivity.hovered) {
				raycaster.setFromCamera(interactivity.pointer.current, camera.current)
				intersection = raycaster.intersectObject(event.object)[0]
			}
		},
		{ autoStart: false }
	)

	$effect(() => {
		if (!enabled) {
			untrack(() => {
				p1 = undefined
				p2 = undefined
				step = 'idle'
			})
		}
	})

	$effect(() => {
		if (enabled) {
			start()
		} else {
			stop()
		}
	})
</script>

<Portal id="dashboard">
	<fieldset>
		<Button
			active
			icon="ruler"
			class={enabled ? '' : 'text-gray-4!'}
			description="{enabled ? 'Disable' : 'Enable'} measurement"
			onclick={() => {
				settings.current.enableMeasure = !settings.current.enableMeasure
			}}
		/>
	</fieldset>
</Portal>

<svelte:window
	onpointerdown={enabled ? onpointerdown : undefined}
	onpointerup={enabled ? onpointerup : undefined}
/>

{#if enabled}
	{#if p1}
		<DotSprite position={p1.toArray()} />
	{/if}

	{#if p2}
		<DotSprite position={p2.toArray()} />
	{/if}

	{#if p1 && p2}
		<T.Mesh>
			<MeshLineGeometry points={[p1, p2]} />
			<MeshLineMaterial
				width={0.015}
				depthTest={false}
				color="black"
			/>
		</T.Mesh>
		<HTML
			center
			position={htmlPosition.lerpVectors(p1, p2, 0.5).toArray()}
		>
			<div class="border border-black bg-white px-1 py-0.5 text-xs">
				{p1.distanceTo(p2).toFixed(2)}m
			</div>
		</HTML>
	{/if}
{/if}
