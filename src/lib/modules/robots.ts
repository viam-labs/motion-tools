import type { DialWebRTCConf } from '@viamrobotics/sdk'

export type PlaygroundRobotsConfig = Record<
	string,
	{
		host: string
		partId: string
		apiKeyId: string
		apiKeyValue: string
		signalingAddress: string
	}
>

export const loadRobots = () => {
	const rawRobots = import.meta.env.VITE_PLAYGROUND_ROBOTS
	if (!rawRobots) {
		throw new Error(
			'Cannot find VITE_PLAYGROUND_ROBOTS. Please read the README.md playground section for more info'
		)
	}
	return JSON.parse(rawRobots) as PlaygroundRobotsConfig
}

export const getDialConfs = (robots: PlaygroundRobotsConfig): Record<string, DialWebRTCConf> =>
	Object.fromEntries(
		Object.values(robots).map((robot) => [
			robot.partId,
			{
				host: robot.host,
				credential: { type: 'api-key', payload: robot.apiKeyValue },
				authEntity: robot.apiKeyId,
				signalingAddress: robot.signalingAddress,
				// Important -- otherwise firefox makes make ~100 failed reqs / sec
				reconnectMaxAttempts: 5,
			},
		])
	)
