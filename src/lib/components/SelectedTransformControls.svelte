<script lang="ts">
	import { T, useThrelte } from '@threlte/core'
	import { TransformControls } from '@threlte/extras'
	import { Group, MathUtils, Matrix4 } from 'three'

	import { relations, traits, useQuery, useTrait } from '$lib/ecs'
	import { FrameEditor } from '$lib/editing/FrameEditor'
	import { useTransformControls } from '$lib/hooks/useControls.svelte'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { useFragmentInfo } from '$lib/hooks/useFragmentInfo.svelte'
	import { usePartConfig } from '$lib/hooks/usePartConfig.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import { createPose, matrixToPose, poseToMatrix, solveEditedMatrix } from '$lib/transform'

	const { invalidate } = useThrelte()
	const settings = useSettings()
	const environment = useEnvironment()
	const fragmentInfo = useFragmentInfo()
	const transformControls = useTransformControls()
	const partConfig = usePartConfig()
	const frameEditor = new FrameEditor(partConfig.updateFrame, partConfig.deleteFrame)
	const selected = useQuery(traits.Selected)

	const mode = $derived(settings.current.transformMode)
	const entity = $derived(selected.current[0])
	const transformable = useTrait(() => entity, traits.Transformable)
	const invisible = useTrait(() => entity, traits.InheritedInvisible)
	const configMatrix = useTrait(() => entity, traits.Matrix)
	const liveMatrix = useTrait(() => entity, traits.LiveMatrix)
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)
	const box = useTrait(() => entity, traits.Box)
	const sphere = useTrait(() => entity, traits.Sphere)
	const capsule = useTrait(() => entity, traits.Capsule)
	const name = useTrait(() => entity, traits.Name)
	const hasScalableGeometry = $derived(
		box.current !== undefined || sphere.current !== undefined || capsule.current !== undefined
	)
	const isFragmentComponentWithVariables = $derived(
		name.current && Object.keys(fragmentInfo.current?.[name.current]?.variables ?? {}).length > 0
	)

	// Non-mesh frames (reference frames, and instanced box/sphere/capsule frames)
	// render no named scene object, so `getObjectByName` can't locate a gizmo
	// target. Drive a dedicated anchor Group from the selected entity's
	// WorldMatrix instead — the same world transform the entity renderers
	// compose. They mount at the scene root with `matrixAutoUpdate = false`, so
	// this anchor's world-space transform matches theirs exactly.
	const anchor = new Group()
	anchor.matrixAutoUpdate = false

	$effect.pre(() => {
		const world = worldMatrix.current
		if (!world) return

		anchor.matrix.copy(world)
		// Keep position/quaternion/scale in sync with the matrix so
		// TransformControls (which reads/writes those fields) sees the entity's
		// actual transform on drag start.
		anchor.matrix.decompose(anchor.position, anchor.quaternion, anchor.scale)
		anchor.updateMatrixWorld()
		invalidate()
	})

	const ref = $derived(worldMatrix.current ? anchor : undefined)

	const activeMode = $derived.by<'translate' | 'rotate' | 'scale' | undefined>(() => {
		if (mode === 'none' || !transformable.current) return

		// Scale only does anything for primitive geometries the gizmo can size.
		if (mode === 'scale' && !hasScalableGeometry) return

		return mode
	})
	const isSphereScale = $derived(activeMode === 'scale' && sphere.current !== undefined)
	const isCapsuleScale = $derived(activeMode === 'scale' && capsule.current !== undefined)
	const transforming = $derived(
		ref && entity && activeMode && !isFragmentComponentWithVariables && !invisible.current
	)

	const refPose = createPose()
	const tempRefMatrix = new Matrix4()
	const tempEditedMatrix = new Matrix4()
	const tempParentInverse = new Matrix4()
	const tempPose = createPose()

	let scaleStart:
		| { type: 'box'; x: number; y: number; z: number }
		| { type: 'sphere'; r: number }
		| { type: 'capsule'; r: number; l: number }
		| undefined

	const captureScaleStart = () => {
		if (!entity || activeMode !== 'scale') {
			scaleStart = undefined
			return
		}

		const box = entity.get(traits.Box)
		if (box) {
			scaleStart = { type: 'box', ...box }
			return
		}

		const sphere = entity.get(traits.Sphere)
		if (sphere) {
			scaleStart = { type: 'sphere', ...sphere }
			return
		}

		const capsule = entity.get(traits.Capsule)
		if (capsule) {
			scaleStart = { type: 'capsule', ...capsule }
			return
		}

		scaleStart = undefined
	}

	const onMouseDown = () => {
		captureScaleStart()

		environment.current.viewerMode = 'edit'
		transformControls.setActive(true)
	}

	const onChange = () => {
		if (!ref || !entity || !activeMode) return

		const isFrameEntity = entity.has(traits.FramesAPI)
		if (activeMode === 'translate' || activeMode === 'rotate') {
			if (isFrameEntity) {
				stageFrameTransform()
			} else {
				stageLocalTransform()
			}
		} else {
			// scale → bake the gizmo's scale factor into the geometry trait,
			// then reset the object's scale so subsequent drags start from 1.
			if (!scaleStart) {
				captureScaleStart()
			}

			// Clamp at 0 — the gizmo can produce negative scale factors when
			// dragged past the origin, which would yield negative dimensions
			// and a degenerate OBB.
			if (scaleStart?.type === 'box') {
				const next = {
					x: Math.max(0, scaleStart.x * ref.scale.x),
					y: Math.max(0, scaleStart.y * ref.scale.y),
					z: Math.max(0, scaleStart.z * ref.scale.z),
				}
				if (isFrameEntity) {
					frameEditor.setGeometry(entity, { type: 'box', ...next })
				} else {
					entity.set(traits.Box, next)
				}
			} else if (scaleStart?.type === 'sphere') {
				const next = { r: Math.max(0, scaleStart.r * ref.scale.x) }
				if (isFrameEntity) {
					frameEditor.setGeometry(entity, { type: 'sphere', ...next })
				} else {
					entity.set(traits.Sphere, next)
				}
			} else if (scaleStart?.type === 'capsule') {
				const next = {
					r: Math.max(0, scaleStart.r * ref.scale.x),
					l: Math.max(0, scaleStart.l * ref.scale.y),
				}
				if (isFrameEntity) {
					frameEditor.setGeometry(entity, { type: 'capsule', ...next })
				} else {
					entity.set(traits.Capsule, next)
				}
			}

			ref.scale.setScalar(1)
		}
	}

	const onMouseUp = () => {
		scaleStart = undefined
		transformControls.setActive(false)
	}

	/**
	 * Build the entity's parent-relative drag target from the gizmo's world-space
	 * `ref` transform into `out`.
	 *
	 * Entity renderers mount at the scene root with `matrixAutoUpdate = false`
	 * and recompose `group.matrix` from the `WorldMatrix` trait, so
	 * `ref.position` / `ref.quaternion` are world-space. Matrix-shaped traits
	 * store local-to-parent, so we left-multiply by the parent's inverted
	 * WorldMatrix. Otherwise recomposition (parentWorld × local) re-applies the
	 * parent transform and the entity lands at parentWorld × where-it-was-dragged.
	 */
	const computeLocalDragTarget = (out: Matrix4) => {
		if (!ref || !entity) return

		out.makeRotationFromQuaternion(ref.quaternion)
		out.setPosition(ref.position)

		const parentWorld = entity.targetFor(relations.ChildOf)?.get(traits.WorldMatrix)
		if (parentWorld) {
			tempParentInverse.copy(parentWorld).invert()
			out.premultiply(tempParentInverse)
		}
	}

	/**
	 * Stages a translate/rotate drag for a frame system entity into the edit
	 * session. With a kinematic offset (LiveMatrix + Matrix both present), the
	 * parent-relative target feeds solveEditedMatrix to back out the EditedMatrix
	 * satisfying live × baseline⁻¹ × edited = local. Without one, Frame.svelte's
	 * blend short-circuits to EditedMatrix, so we stage the target pose directly.
	 */
	const stageFrameTransform = () => {
		if (!ref || !entity) return

		computeLocalDragTarget(tempRefMatrix)
		matrixToPose(tempRefMatrix, refPose)

		const live = liveMatrix.current
		const config = configMatrix.current

		if (!live || !config) {
			if (activeMode === 'translate') {
				frameEditor.setPose(entity, {
					x: refPose.x,
					y: refPose.y,
					z: refPose.z,
				})
			} else if (activeMode === 'rotate') {
				frameEditor.setPose(entity, {
					oX: refPose.oX,
					oY: refPose.oY,
					oZ: refPose.oZ,
					theta: refPose.theta,
				})
			}
			return
		}

		solveEditedMatrix(config, live, tempRefMatrix, tempEditedMatrix)
		matrixToPose(tempEditedMatrix, tempPose)
		frameEditor.setPose(entity, { ...tempPose })
	}

	/**
	 * Stages a translate/rotate drag for a non-frame-system entity (e.g. a gizmo)
	 * by writing the dragged component into the Matrix trait. Gizmos carry no
	 * LiveMatrix, so there's no live-pose blend to invert — the parent-relative
	 * target is the new local transform.
	 */
	const stageLocalTransform = () => {
		if (!ref || !entity) return

		const matrix = entity.get(traits.Matrix)
		if (!matrix) return

		computeLocalDragTarget(tempRefMatrix)

		// update only the dragged component
		matrixToPose(matrix, tempPose)
		matrixToPose(tempRefMatrix, refPose)
		if (activeMode === 'translate') {
			tempPose.x = refPose.x
			tempPose.y = refPose.y
			tempPose.z = refPose.z
		} else {
			tempPose.oX = refPose.oX
			tempPose.oY = refPose.oY
			tempPose.oZ = refPose.oZ
			tempPose.theta = refPose.theta
		}

		poseToMatrix(tempPose, matrix)
		entity.changed(traits.Matrix)
	}
</script>

{#if transforming}
	<T
		is={anchor}
		dispose={false}
	/>
	{#key entity}
		<TransformControls
			object={ref}
			mode={activeMode}
			space={settings.current.transformSpace}
			translationSnap={settings.current.snapping && settings.current.snapTranslate > 0
				? settings.current.snapTranslate
				: null}
			rotationSnap={settings.current.snapping && settings.current.snapRotate > 0
				? MathUtils.degToRad(settings.current.snapRotate)
				: null}
			scaleSnap={settings.current.snapping && settings.current.snapScale > 0
				? settings.current.snapScale
				: null}
			showY={!isSphereScale}
			showZ={!isSphereScale && !isCapsuleScale}
			onmouseDown={onMouseDown}
			onobjectChange={onChange}
			onmouseUp={onMouseUp}
		/>
	{/key}
{/if}
