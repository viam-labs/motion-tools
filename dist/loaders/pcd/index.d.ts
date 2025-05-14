export declare const parsePCD: (array: Uint8Array<ArrayBufferLike>) => Promise<{
    positions: ArrayBuffer;
    colors: ArrayBuffer | undefined;
}>;
