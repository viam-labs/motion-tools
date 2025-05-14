import { Color } from 'three';
/**
 * Darkens a THREE.Color by a given percentage while preserving hue.
 * @param color The original THREE.Color instance.
 * @param percent The percentage to darken (0-100).
 * @returns A new THREE.Color instance with the darkened color.
 */
export const darkenColor = (value, percent) => {
    const color = new Color(value);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.l = Math.max(0, hsl.l * (1 - percent / 100));
    return color.setHSL(hsl.h, hsl.s, hsl.l);
};
