import tailwindcss from '@tailwindcss/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import { getLocalIP } from './server/ip'
import dns from 'node:dns'

dns.setDefaultResultOrder('verbatim')

const localIP = getLocalIP()

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],

	define: {
		__BACKEND_IP__: JSON.stringify(localIP),
	},

	optimizeDeps: {
		esbuildOptions: {
			target: 'esnext',
		},
	},
	build: {
		target: 'esnext',
	},

	server: {
		host: true,
		port: 5173,
		allowedHosts: true,
		cors: true,
	},

	ssr: {
		noExternal: ['camera-controls'],
	},

	test: {
		workspace: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting()],

				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts'],
				},
			},
			{
				extends: './vite.config.ts',

				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
				},
			},
		],
	},
})
