<script lang='ts'>
  import { T, useTask } from '@threlte/core'
  import { ImageMaterial } from '@threlte/extras';
  import BentPlaneGeometry from './BentPlaneGeometry.svelte';
  import { Headset, useHeadset } from '@threlte/xr';
	import { Euler, Group, Vector3, Quaternion, type Mesh, MathUtils } from 'three';

  const headset = useHeadset()

  let group: Group
  let mesh: Mesh

  let dummy = new Group()
  let euler = new Euler()
  let quaternion = new Quaternion()

  useTask(() => {
    group.position.lerp(headset.position, 0.025)

    const direction = headset.getWorldDirection(new Vector3())
    euler.set(0, Math.atan2(direction.x, direction.z), 0)
    quaternion.setFromEuler(euler)
    group.quaternion.slerp(quaternion, 0.025)

    mesh.lookAt(headset.position)
  })
</script>

<T is={dummy} position={[0, 0, -2]} />

<T.Group bind:ref={group}>
  <T.Mesh bind:ref={mesh} position={[0, 0, -2]}>
    <BentPlaneGeometry args={[0.1, 1, 1, 20, 20]} />
    <ImageMaterial
      transparent
      radius={0.1}
      url='https://images4.fanpop.com/image/photos/16100000/Cute-Kitten-kittens-16122061-1280-800.jpg'
    />
  </T.Mesh>
</T.Group>
