import { PoseInFrame, ResourceName } from '@viamrobotics/sdk';
type PoseWithComponent = PoseInFrame & {
    component: ResourceName;
};
interface Context {
    current: PoseWithComponent[];
}
export declare const providePoses: (partID: () => string) => void;
export declare const usePoses: () => Context;
export {};
