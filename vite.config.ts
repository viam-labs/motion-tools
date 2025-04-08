import tailwindcss from '@tailwindcss/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import os from 'os'

/**
 * Get the local IP (non-internal IPv4 address)
 */
function getLocalIP() {
	const interfaces = os.networkInterfaces()
	for (const ifaceList of Object.values(interfaces)) {
		for (const iface of ifaceList ?? []) {
			if (iface.family === 'IPv4' && !iface.internal) {
				return iface.address
			}
		}
	}
	return 'localhost'
}

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
