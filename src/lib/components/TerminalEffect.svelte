<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core'
	import { onDestroy } from 'svelte'
	import { Vector2, Vector3 } from 'three'
	import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
	import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
	import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

	const { renderer, scene, camera, size, renderStage, autoRender, invalidate } = useThrelte()

	const terminalShader = {
		uniforms: {
			tDiffuse: { value: null },
			time: { value: 0 },
			resolution: { value: new Vector2(1, 1) },
			tint: { value: new Vector3(0.25, 1.0, 0.45) },
		},
		vertexShader: /* glsl */ `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: /* glsl */ `
			uniform sampler2D tDiffuse;
			uniform float time;
			uniform vec2 resolution;
			uniform vec3 tint;
			varying vec2 vUv;

			float hash(vec2 p) {
				return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
			}

			void main() {
				vec2 centered = vUv - 0.5;
				float d2 = dot(centered, centered);
				vec2 uv = vUv + centered * d2 * 0.22;

				if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
					gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
					return;
				}

				vec2 px = 1.0 / resolution;
				vec3 c0 = texture2D(tDiffuse, uv).rgb;
				vec3 c1 = texture2D(tDiffuse, uv + vec2(px.x * 1.5, 0.0)).rgb;
				vec3 c2 = texture2D(tDiffuse, uv - vec2(px.x * 1.5, 0.0)).rgb;
				vec3 sampled = (c0 * 2.0 + c1 + c2) * 0.25;

				float lum = dot(sampled, vec3(0.299, 0.587, 0.114));
				lum = pow(clamp(lum, 0.0, 1.0), 0.85);
				vec3 color = tint * lum;

				float scan = 0.5 + 0.5 * sin(uv.y * resolution.y * 1.25);
				color *= 0.82 + 0.18 * scan;

				float roll = 0.5 + 0.5 * sin(uv.y * 4.0 + time * 1.4);
				color *= 0.96 + 0.04 * roll;

				float n = hash(uv * resolution + time);
				color += (n - 0.5) * 0.08;

				float vig = smoothstep(0.95, 0.15, d2 * 2.0);
				color *= vig;

				float edge = smoothstep(0.0, 0.02, uv.x) *
					smoothstep(0.0, 0.02, uv.y) *
					smoothstep(0.0, 0.02, 1.0 - uv.x) *
					smoothstep(0.0, 0.02, 1.0 - uv.y);
				color *= edge;

				gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
			}
		`,
	}

	const composer = new EffectComposer(renderer)
	const renderPass = new RenderPass(scene, camera.current)
	const terminalPass = new ShaderPass(terminalShader)
	composer.addPass(renderPass)
	composer.addPass(terminalPass)

	$effect(() => {
		renderPass.camera = camera.current
		invalidate()
	})

	$effect(() => {
		const { width, height } = size.current
		composer.setSize(width, height)
		terminalShader.uniforms.resolution.value.set(width, height)
		invalidate()
	})

	$effect(() => {
		autoRender.set(false)
		invalidate()
		return () => {
			autoRender.set(true)
			invalidate()
		}
	})

	useTask(
		(delta) => {
			terminalShader.uniforms.time.value += delta
			composer.render(delta)
			invalidate()
		},
		{ stage: renderStage, autoInvalidate: false }
	)

	onDestroy(() => {
		composer.dispose()
	})
</script>
