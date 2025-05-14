import { type IntersectionEvent } from '@threlte/extras';
export declare const useObjectEvents: (uuid: () => string) => {
    readonly visible: boolean | undefined;
    onpointerenter: (event: IntersectionEvent<MouseEvent>) => void;
    onpointerleave: (event: IntersectionEvent<MouseEvent>) => void;
    ondblclick: (event: IntersectionEvent<MouseEvent>) => void;
    onclick: (event: IntersectionEvent<MouseEvent>) => void;
    onpointermissed: () => void;
};
