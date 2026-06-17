import { untrack } from 'svelte'
import { MathUtils } from 'three'

type Level = 'info' | 'warn' | 'error'

interface Log {
	uuid: string
	message: string
	count: number
	level: Level
	timestamp: string
}

interface Context {
	current: Log[]
	errors: Log[]
	warnings: Log[]
	add(message: string, level?: Level): void
}

const MAX_LOGS = 200

// Logs is a singleton. We only have one logger per app and we need to access it anywhere.
let context: Context | undefined

export const provideLogs = () => {
	// Plain insertion-ordered Map keyed by `${level}|${timestamp}|${message}`
	// drives storage; a single `$state` version counter drives reactivity.
	// Hot path is `Map.set` (or in-place `count++`) plus `version++` — no
	// array allocation per add. The display arrays are materialized lazily
	// in `$derived.by`, so a closed logs panel costs nothing.
	const entries = new Map<string, Log>()
	let version = $state(0)

	const intl = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'short',
		timeStyle: 'short',
	})

	const dedupKey = (timestamp: string, level: Level, message: string): string =>
		`${level}\0${timestamp}\0${message}`

	const all = $derived.by(() => {
		void version
		const out = [...entries.values()]
		out.reverse()
		return out
	})
	const errors = $derived(all.filter((l) => l.level === 'error'))
	const warnings = $derived(all.filter((l) => l.level === 'warn'))

	context = {
		get current() {
			return all
		},
		get errors() {
			return errors
		},
		get warnings() {
			return warnings
		},
		add(message, level = 'info') {
			untrack(() => {
				const timestamp = intl.format(Date.now())
				const k = dedupKey(timestamp, level, message)
				const match = entries.get(k)

				if (match) {
					match.count += 1
				} else {
					entries.set(k, {
						uuid: MathUtils.generateUUID(),
						message,
						count: 1,
						level,
						timestamp,
					})
					if (entries.size > MAX_LOGS) {
						const oldestKey = entries.keys().next().value
						if (oldestKey !== undefined) entries.delete(oldestKey)
					}
				}

				version++
			})
		},
	}

	return context
}

export const useLogs = (): Context => {
	// return a no-op context if the plugin isn't installed
	return (
		context ?? {
			current: [],
			errors: [],
			warnings: [],
			add: () => undefined,
		}
	)
}
