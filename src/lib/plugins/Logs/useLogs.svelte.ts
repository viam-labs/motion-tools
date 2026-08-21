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
	// A Map keyed by `${level}|${timestamp}|${message}` holds the logs and a `$state` version counter drives reactivity, so an add costs no array allocation.
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

/** The logs context, or a no-op context when the Logs plugin is not installed. */
export const useLogs = (): Context => {
	return (
		context ?? {
			current: [],
			errors: [],
			warnings: [],
			add: () => undefined,
		}
	)
}
