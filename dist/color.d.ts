import { Color, type ColorRepresentation } from 'three';
/**
 * Darkens a THREE.Color by a given percentage while preserving hue.
 * @param color The original THREE.Color instance.
 * @param percent The percentage to darken (0-100).
 * @returns A new THREE.Color instance with the darkened color.
 */
export declare const darkenColor: (value: ColorRepresentation, percent: number) => Color;
