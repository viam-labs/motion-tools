interface ConnectionConfig {
    host: string;
    partId: string;
    apiKeyId: string;
    apiKeyValue: string;
    signalingAddress: string;
}
interface Context {
    current: ConnectionConfig[];
}
export declare const provideConnectionConfigs: () => void;
export declare const useConnectionConfigs: () => Context;
export declare const useActiveConnectionConfig: () => {
    readonly current: ConnectionConfig | undefined;
    set(index: number | undefined): void;
};
export {};
