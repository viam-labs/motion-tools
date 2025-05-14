interface Context {
    current: string;
}
export declare const createPartIDContext: (partId: () => string) => Context;
export declare const usePartID: () => Context;
export {};
