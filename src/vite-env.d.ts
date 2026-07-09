/// <reference types="vite/client" />
/// <reference types="vite-plugin-glsl/ext" />

// Vite define replacements (set at build time via vite.config.ts)
declare const BACKEND_IP: string
declare const WS_PORT: string

declare module '*.hdr'

// troika-three-text ships no type declarations; declare the one API we use.
declare module 'troika-three-text' {
	export function configureTextBuilder(config: { useWorker?: boolean }): void
}
