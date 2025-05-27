import { getContext, setContext } from 'svelte'
import { MathUtils } from 'three'

const key = Symbol('logs-context')

type Level = 'info' | 'warn' | 'error'

interface Log {
	uuid: string
	message: string
	level: Level
	timestamp: string
}

interface Context {
	current: Log[]
	add(message: string, level?: Level): void
}

export const provideLogs = () => {
	const logs = $state<Log[]>([])

	const intl = new Intl.DateTimeFormat('en-US', {
		dateStyle: 'short',
		timeStyle: 'short',
	})

	setContext<Context>(key, {
		get current() {
			return logs
		},
		add(message, level = 'info') {
			logs.push({
				message,
				level,
				uuid: MathUtils.generateUUID(),
				timestamp: intl.format(Date.now()),
			})

			if (logs.length > 1000) {
				logs.shift()
			}
		},
	})
}

export const useLogs = () => {
	return getContext<Context>(key)
}
