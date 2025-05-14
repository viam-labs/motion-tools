import type { DialWebRTCConf } from '@viamrobotics/sdk';
export type PlaygroundRobotsConfig = Record<string, {
    host: string;
    partId: string;
    apiKeyId: string;
    apiKeyValue: string;
    signalingAddress: string;
    disableSessions?: boolean;
}>;
export declare const loadRobots: () => PlaygroundRobotsConfig;
export declare const getDialConfs: (robots: PlaygroundRobotsConfig) => Record<string, DialWebRTCConf>;
export declare const getDialConf: (robot: PlaygroundRobotsConfig[string]) => DialWebRTCConf;
