<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements'

	import { ToastVariant, useToast } from '@viamrobotics/prime-core'

	import { createBufferGeometry } from '$lib/attribute'
	import { ColorFormat } from '$lib/buf/draw/v1/metadata_pb'
	import { traits } from '$lib/ecs'
	import { useWorld } from '$lib/ecs/useWorld'
	import { useCameraControls } from '$lib/hooks/useControls.svelte'
	import { useDrawConnectionConfig } from '$lib/hooks/useDrawConnectionConfig.svelte'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useRelationships } from '$lib/hooks/useRelationships.svelte'
	import { spawnSnapshotEntities } from '$lib/snapshot'

	import CloudPlanPicker from './CloudPlanPicker.svelte'
	import type { FileDropperSuccess } from './file-dropper'
	import { createPlanRequestDropper } from './plan-request-dropper'
	import { useFileDrop } from './useFileDrop.svelte'

	const props: HTMLAttributes<HTMLDivElement> = $props()

	const world = useWorld()
	const toast = useToast()
	const cameraControls = useCameraControls()
	const relationships = useRelationships()
	const drawConnectionConfig = useDrawConnectionConfig()
	const partID = usePartID()
	const drawServerURL = $derived(
		drawConnectionConfig.current?.backendIP
			? `http://${drawConnectionConfig.current.backendIP}:3030`
			: 'http://localhost:3030'
	)

	let totalPlanSteps = $state(0)
	let currentPlanStep = $state(-1)
	let steppingPlan = $state(false)

	const planRequestDropper = createPlanRequestDropper(drawServerURL)

	const stepPlan = async (direction: 'prev' | 'next') => {
		if (steppingPlan || totalPlanSteps <= 0) return
		steppingPlan = true
		try {
			const resp = await fetch(`${drawServerURL}/plan-request/step`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ direction }),
			})
			if (!resp.ok) {
				const text = await resp.text()
				throw new Error(text || 'failed to step plan')
			}

			const body = (await resp.json()) as { current_step: number; total_steps: number }
			currentPlanStep = body.current_step ?? currentPlanStep
			totalPlanSteps = body.total_steps ?? totalPlanSteps
		} catch (error) {
			toast({
				message: `Plan step failed: ${error instanceof Error ? error.message : 'unknown error'}`,
				variant: ToastVariant.Danger,
			})
		} finally {
			steppingPlan = false
		}
	}

	const fileDrop = useFileDrop(
		(result: FileDropperSuccess) => handleResult(result),
		(message) => toast({ message, variant: ToastVariant.Danger }),
		planRequestDropper
	)

	function handleResult(result: FileDropperSuccess) {
		if (result.type !== 'plan-request') {
			totalPlanSteps = 0
			currentPlanStep = -1
		}

		switch (result.type) {
			case 'snapshot': {
				const spawned = spawnSnapshotEntities(world, result.snapshot)
				for (const entity of spawned) {
					relationships.apply(entity.entity, entity.relationships)
					const uuid = entity.entity.get(traits.UUID)
					if (uuid) relationships.flush(uuid)
				}

				const { sceneCamera } = result.snapshot.sceneMetadata ?? {}

				if (sceneCamera) {
					const { x = 0, y = 0, z = 0 } = sceneCamera.position ?? {}
					const { x: lx = 0, y: ly = 0, z: lz = 0 } = sceneCamera.lookAt ?? {}

					cameraControls.setPose({
						position: [x * 0.001, y * 0.001, z * 0.001],
						lookAt: [lx * 0.001, ly * 0.001, lz * 0.001],
					})
				}

				break
			}
			case 'pcd': {
				const geometry = createBufferGeometry(result.pcd.positions, {
					colors: result.pcd.colors,
					colorFormat: ColorFormat.RGB,
				})

				world.spawn(
					traits.Name(result.name),
					traits.BufferGeometry(geometry),
					traits.Points,
					traits.DroppedFile,
					traits.Removable
				)
				break
			}
			case 'ply': {
				world.spawn(
					traits.Name(result.name),
					traits.BufferGeometry(result.ply),
					traits.DroppedFile,
					traits.Removable
				)
				break
			}
			case 'plan-request': {
				totalPlanSteps = result.totalSteps
				currentPlanStep = result.currentStep
				break
			}
		}

		toast({ message: `${result.name} loaded.`, variant: ToastVariant.Success })
	}
</script>

<svelte:window
	ondragenter={fileDrop.ondragenter}
	ondragleave={fileDrop.ondragleave}
	ondragover={fileDrop.ondragover}
/>

<div
	class={{
		'fixed inset-0 z-9999': true,
		'pointer-events-none': fileDrop.dropState === 'inactive',
		'bg-black/10': fileDrop.dropState !== 'inactive',
	}}
	role="region"
	aria-label="File drop zone"
	ondrop={fileDrop.ondrop}
	{...props}
></div>

{#if totalPlanSteps > 0}
	<div class="pointer-events-auto fixed right-4 top-4 z-[10000] flex items-center gap-2 rounded bg-zinc-900/85 px-3 py-2 text-xs text-white">
		<button
			type="button"
			class="rounded border border-zinc-600 px-2 py-1 disabled:opacity-40"
			onclick={() => stepPlan('prev')}
			disabled={steppingPlan || currentPlanStep <= 0}
		>
			Prev
		</button>
		<span>Step {Math.max(currentPlanStep, 0) + 1} / {totalPlanSteps}</span>
		<button
			type="button"
			class="rounded border border-zinc-600 px-2 py-1 disabled:opacity-40"
			onclick={() => stepPlan('next')}
			disabled={steppingPlan || currentPlanStep >= totalPlanSteps - 1}
		>
			Next
		</button>
	</div>
{/if}

{#if partID.current}
	<div class="pointer-events-none fixed right-4 top-16 z-[10000]">
		<CloudPlanPicker
			partId={partID.current}
			{planRequestDropper}
			onResult={handleResult}
			onError={(message) => toast({ message, variant: ToastVariant.Danger })}
		/>
	</div>
{/if}
