import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import remarkGfm from 'remark-gfm'
import starlightThemeNova from 'starlight-theme-nova'

const base = process.env.DOCS_BASE ?? '/visualization/'
const site = process.env.DOCS_SITE ?? 'https://viamrobotics.github.io'

export default defineConfig({
	site,
	base,
	// astro 6.4.x stopped applying GFM to .mdx by default, which flattened every
	// pipe table into a paragraph. Declaring the plugin explicitly restores it
	// (the MDX integration extends markdown config) and is version-independent.
	markdown: {
		remarkPlugins: [remarkGfm],
	},
	integrations: [
		starlight({
			plugins: [starlightThemeNova()],
			title: 'Viam Visualization',
			description: '3D visualization and debugging interface for Viam robotics.',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/viamrobotics/visualization',
				},
			],
			customCss: [
				'@fontsource-variable/roboto-mono',
				'@fontsource-variable/public-sans',
				'./src/tailwind.css',
			],
			sidebar: [
				{ label: 'Introduction', link: '/' },
				{
					label: 'Guides',
					items: [
						{ label: 'Running locally', link: '/guides/local-usage/' },
						{ label: 'Embedding <Visualizer />', link: '/guides/embedding/' },
						{
							label: 'Implementing WorldStateStoreService',
							link: '/guides/worldstatestore/',
						},
					],
				},
				{
					label: 'Plugins',
					items: [
						{ label: '<Debug />', link: '/plugins/debug/' },
						{ label: '<DrawService />', link: '/plugins/draw-service/' },
						{ label: '<Fullscreen />', link: '/plugins/fullscreen/' },
						{ label: '<MeasureTool />', link: '/plugins/measure-tool/' },
						{ label: '<MotionPlanReplayer />', link: '/plugins/motion-plan-replayer/' },
						{ label: '<SelectionTool />', link: '/plugins/selection/' },
						{ label: '<Skybox />', link: '/plugins/skybox/' },
						{ label: '<LLMSceneBuilder />', link: '/plugins/llm-scene-builder/' },
					],
				},
				{
					label: 'API reference',
					items: [
						{
							label: 'client/api',
							link: '/api/client-api/',
							badge: { text: 'beta', variant: 'tip' },
						},
						{ label: 'draw', link: '/api/draw/' },
					],
				},
				{
					label: 'Migration guides',
					items: [
						{
							label: 'v1 → v2',
							link: '/migration/v1-to-v2/',
							badge: { text: 'preview', variant: 'success' },
						},
					],
				},
				{ label: 'Playground', link: '/playground/snapshot' },
			],
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
})
