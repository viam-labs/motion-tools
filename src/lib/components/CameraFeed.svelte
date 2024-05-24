<script lang='ts'>
  import { T, useTask } from '@threlte/core'
  import BentPlaneGeometry from './BentPlaneGeometry.svelte';
  import { useHeadset } from '@threlte/xr';
	import { Euler, Group, Vector3, Quaternion, type Mesh } from 'three';
	import { onMount } from 'svelte';

  const headset = useHeadset()

  let group: Group
  let mesh: Mesh

  let euler = new Euler()
  let quaternion = new Quaternion()
  let direction = new Vector3()

  useTask(() => {
    group.position.lerp(headset.position, 0.025)

    headset.getWorldDirection(direction)
    euler.set(0, Math.atan2(direction.x, direction.z), 0)
    quaternion.setFromEuler(euler)
    group.quaternion.slerp(quaternion, 0.025)

    mesh.lookAt(headset.position)
  })

  let video: HTMLVideoElement | undefined
  let aspect = 1
  let ready = false

  onMount(() => {
    video = document.createElement('video')
    video.addEventListener('canplaythrough', () => {
      if (!video) return
      ready = true
      aspect = video?.videoWidth / video?.videoHeight
      video.play()
    })
    video.src = '/Big_Buck_Bunny_4K.webm'
  })
</script>

<T.Group bind:ref={group}>
  <T.Mesh bind:ref={mesh} visible={ready} position={[0, 0, -2]}>
    <BentPlaneGeometry args={[0.1, aspect, 1, 20, 20]} />
    <T.MeshStandardMaterial>
      {#if video}
        <T.VideoTexture attach='map' args={[video]} />
      {/if}
    </T.MeshStandardMaterial>
  </T.Mesh>
</T.Group>
