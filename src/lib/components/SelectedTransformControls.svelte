<script lang="ts">
	import { TransformControls } from '@threlte/extras'
	import { Matrix4 } from 'three'

	import type { FrameEditSession } from '$lib/editing/FrameEditSession'

	import { relations, traits, useTrait } from '$lib/ecs'
	import { useTransformControls } from '$lib/hooks/useControls.svelte'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { useFrameEditSession } from '$lib/hooks/useFrameEditSession.svelte'
	import { usePartConfig } from '$lib/hooks/usePartConfig.svelte'
	import { useSelectedEntity, useSelectedObject3d } from '$lib/hooks/useSelection.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import {
		createPose,
		matrixToPose,
		poseToMatrix,
		quaternionToPose,
		solveEditedMatrix,
		vector3ToPose,
	} from '$lib/transform'

	const settings = useSettings()
	const environment = useEnvironment()
	const partConfig = usePartConfig()
	const transformControls = useTransformControls()
	const selectedEntity = useSelectedEntity()
	const selectedObject3d = useSelectedObject3d()
	const sessions = useFrameEditSession()

	const mode = $derived(settings.current.transformMode)
	const entity = $derived(selectedEntity.current)
	const transformable = useTrait(() => entity, traits.Transformable)
	const invisible = useTrait(() => entity, traits.InheritedInvisible)
	const configMatrix = useTrait(() => entity, traits.Matrix)
	const liveMatrix = useTrait(() => entity, traits.LiveMatrix)
	const box = useTrait(() => entity, traits.Box)
	const sphere = useTrait(() => entity, traits.Sphere)
	const capsule = useTrait(() => entity, traits.Capsule)
	const name = useTrait(() => entity, traits.Name)
	const hasScalableGeometry = $derived(
		box.current !== undefined || sphere.current !== undefined || capsule.current !== undefined
	)
	const isFragmentComponentWithVariables = $derived(
		name.current &&
			Object.keys(partConfig.componentNameToFragmentInfo?.[name.current]?.variables ?? {}).length >
				0
	)

	// Mesh sets name={entity} on its inner mesh, so useSelectedObject3d resolves
	// to that mesh — not the parent Frame Group we actually want to drive. Walk
	// up to the Group so translate/rotate/scale apply to the whole frame, not
	// the geometry inside it.
	const ref = $derived(selectedObject3d.current?.parent ?? selectedObject3d.current)

	const activeMode = $derived.by<'translate' | 'rotate' | 'scale' | undefined>(() => {
		if (mode === 'none' || !transformable.current) return

		// Scale only does anything for primitive geometries the gizmo can size.
		if (mode === 'scale' && !hasScalableGeometry) return

		return mode
	})
	const isSphereScale = $derived(activeMode === 'scale' && sphere.current !== undefined)
	const isCapsuleScale = $derived(activeMode === 'scale' && capsule.current !== undefined)

	const refPose = createPose()
	const tempRefMatrix = new Matrix4()
	const tempEditedMatrix = new Matrix4()
	const tempParentInverse = new Matrix4()
	const tempPose = createPose()

	let session: FrameEditSession | undefined
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
		if (entity?.has(traits.FramesAPI)) {
			session = sessions.begin([entity])
		}

		captureScaleStart()

		environment.current.viewerMode = 'edit'
		transformControls.setActive(true)
	}

	const onChange = () => {
		if (!ref || !entity || !activeMode) {
			return
		}

		const isFrameEntity = entity.has(traits.FramesAPI)

		if (activeMode === 'translate' || activeMode === 'rotate') {
			if (isFrameEntity) {
				stageFrameTransform()
			} else {
				const matrix = entity.get(traits.Matrix)
				if (matrix) {
					matrixToPose(matrix, tempPose)
					// Frame-style renderers (Frame.svelte, GizmoPlane, GizmoArrow,
					// etc.) set `group.matrixAutoUpdate = false` and re-compose the
					// matrix from `worldMatrix` on every flush. Under that flag,
					// `getWorldQuaternion`/`getWorldPosition` skip updating the
					// local matrix and return the stale pre-drag transform — so
					// the gizmo handles move visually but the entity never
					// actually rotates/translates. Read what TransformControls
					// wrote into the local fields directly.
					//
					// NOTE: this branch is only reached for non-`FramesAPI` entities
					// (frame entities go through `stageFrameTransform` above). It
					// assumes non-frame entity renderers mount directly under the
					// scene root so local ≈ world. If a future plugin mounts a
					// gizmo entity under a non-identity parent, switch back to
					// `getWorldPosition`/`getWorldQuaternion` with a
					// parent-inverse step (see `stageFrameTransform`).
					if (activeMode === 'translate') {
						vector3ToPose(ref.position, tempPose)
					} else {
						quaternionToPose(ref.quaternion, tempPose)
					}
					poseToMatrix(tempPose, matrix)
					entity.changed(traits.Matrix)
				}
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
					session?.stageGeometry(entity, { type: 'box', ...next })
				} else {
					entity.set(traits.Box, next)
				}
			} else if (scaleStart?.type === 'sphere') {
				const next = { r: Math.max(0, scaleStart.r * ref.scale.x) }
				if (isFrameEntity) {
					session?.stageGeometry(entity, { type: 'sphere', ...next })
				} else {
					entity.set(traits.Sphere, next)
				}
			} else if (scaleStart?.type === 'capsule') {
				const next = {
					r: Math.max(0, scaleStart.r * ref.scale.x),
					l: Math.max(0, scaleStart.l * ref.scale.y),
				}
				if (isFrameEntity) {
					session?.stageGeometry(entity, { type: 'capsule', ...next })
				} else {
					entity.set(traits.Capsule, next)
				}
			}

			ref.scale.setScalar(1)
		}
	}

	const onMouseUp = () => {
		session?.commit()
		session = undefined
		scaleStart = undefined
		transformControls.setActive(false)
	}

	/**
	 * Frame.svelte renders frame entities by writing the entity's WorldMatrix
	 * into group.matrix and decomposing it into position/quaternion. The gizmo's
	 * Three.js parent has identity world, so `ref.position` / `ref.quaternion`
	 * are world-space values. Matrix and EditedMatrix store local-to-parent
	 * transforms, so we left-multiply by the parent's inverted WorldMatrix
	 * before staging — otherwise WorldMatrix recomposition (parent × edited)
	 * re-applies the parent's rotation/translation and the frame ends up at
	 * parent × where-the-user-pulled-it.
	 *
	 * With a kinematic offset (LiveMatrix + Matrix both present), the local
	 * target M(local) feeds solveEditedMatrix to back out the EditedMatrix
	 * that satisfies live × baseline⁻¹ × edited = local.
	 */
	const stageFrameTransform = () => {
		if (!ref || !entity) return

		tempRefMatrix.makeRotationFromQuaternion(ref.quaternion)
		tempRefMatrix.setPosition(ref.position)

		const parentEntity = entity.targetFor(relations.ChildOf)
		const parentWorld = parentEntity?.get(traits.WorldMatrix)
		if (parentWorld) {
			tempParentInverse.copy(parentWorld).invert()
			tempRefMatrix.premultiply(tempParentInverse)
		}

		matrixToPose(tempRefMatrix, refPose)

		const live = liveMatrix.current
		const config = configMatrix.current

		if (!live || !config) {
			// No live matrix available — Frame.svelte's blend short-circuits to
			// editedMatrix, so the parent-relative target is what we stage.
			if (activeMode === 'translate') {
				session?.stagePose(entity, {
					x: refPose.x,
					y: refPose.y,
					z: refPose.z,
				})
			} else if (activeMode === 'rotate') {
				session?.stagePose(entity, {
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
		session?.stagePose(entity, { ...tempPose })
	}
</script>

{#if ref && entity && activeMode && !isFragmentComponentWithVariables && !invisible.current}
	{#key entity}
		<TransformControls
			object={ref}
			mode={activeMode}
			translationSnap={settings.current.snapping ? 0.1 : undefined}
			rotationSnap={settings.current.snapping ? Math.PI / 24 : undefined}
			scaleSnap={settings.current.snapping ? 0.1 : undefined}
			showY={!isSphereScale}
			showZ={!isSphereScale && !isCapsuleScale}
			onmouseDown={onMouseDown}
			onobjectChange={onChange}
			onmouseUp={onMouseUp}
		/>
	{/key}
{/if}
