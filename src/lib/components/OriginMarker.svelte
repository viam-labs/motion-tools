<script lang="ts">
	import { T, useTask } from '@threlte/core'
	import { Grid, useGamepad } from '@threlte/extras'
	import { Collider, RigidBody } from '@threlte/rapier'
	import { RigidBody as RigidBodyType } from '@dimforge/rapier3d-compat'
	import { useController } from '@threlte/xr'
	import { Euler, Group, Mesh, Quaternion, Vector3 } from 'three'

	const height = 0.1
	const radius = 0.05

	const group = new Group()
	const mesh = new Mesh()

	const vec3 = new Vector3()
	const quaternion = new Quaternion()

	const offset = new Vector3()
	const position = new Vector3()
	const rotation = new Euler()

	let hovering = $state(false)
	let dragging = $state(false)
	let rotating = $state(false)

	let rigidBody: RigidBodyType | undefined = $state()

	const left = useController('left')
	const leftPad = useGamepad({ xr: true, hand: 'left' })

	leftPad.trigger.on('down', () => {
		dragging = true
		mesh.getWorldPosition(vec3)
		offset.copy($left!.grip.position).sub(vec3)
	})
	leftPad.trigger.on('up', () => (dragging = false))

	leftPad.squeeze.on('down', () => {
		rotating = true
		mesh.getWorldQuaternion(quaternion)
	})
	leftPad.squeeze.on('up', () => (rotating = false))

	const onsensorenter = () => (hovering = true)
	const onsensorexit = () => (hovering = false)

	const { start, stop } = useTask(() => {
		if (!$left || !rigidBody) return
	
		position.copy($left.grip.position).sub(offset)

		rigidBody.setNextKinematicTranslation({ x: position.x, y: position.y, z: position.z })
	}, { autoStart: false })

	$effect(() => hovering && dragging ? start() : stop())
</script>

<T
	is={group}
	rotation.x={Math.PI}
	position={[0, 0.05, 0]}
>
	<RigidBody
		bind:rigidBody
		type="kinematicPosition"
	>
		<Collider
			sensor
			shape="cone"
			args={[height / 2, radius]}
			{onsensorenter}
			{onsensorexit}
		>
			<T is={mesh}>
				<T.ConeGeometry args={[radius, height]} />
				<T.MeshStandardMaterial color={hovering ? 'hotpink' : 'red'} />

				<Grid
					position.y={0.05}
					fadeDistance={1}
					cellSize={0.1}
					cellColor="#fff"
					sectionColor="#fff"
				/>
			</T>
		</Collider>
	</RigidBody>
</T>
