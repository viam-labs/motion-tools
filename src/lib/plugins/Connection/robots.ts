import type { DialWebRTCConf } from '@viamrobotics/sdk'

type RobotDialConfigs = Record<
	string,
	{
		host: string
		partId: string
		apiKeyId: string
		apiKeyValue: string
		signalingAddress: string
		disableSessions?: boolean
	}
>

export const getDialConfs = (robots: RobotDialConfigs): Record<string, DialWebRTCConf> =>
	Object.fromEntries(Object.values(robots).map((robot) => [robot.partId, getDialConf(robot)]))

const getDialConf = (robot: RobotDialConfigs[string]): DialWebRTCConf => {
	return {
		host: robot.host,
		credentials: {
			type: 'api-key',
			payload: robot.apiKeyValue,
			authEntity: robot.apiKeyId,
		},
		signalingAddress: robot.signalingAddress,
		disableSessions: Boolean(robot.disableSessions),
	}
}
