interface Context {
    active: boolean;
    setActive: (value: boolean) => void;
}
export declare const provideTransformControls: () => void;
export declare const useTransformControls: () => Context;
export {};
