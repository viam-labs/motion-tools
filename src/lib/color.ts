import { Color, type ColorRepresentation } from 'three'
import twColors from 'tailwindcss/colors'

// Step 3: linear sRGB → sRGB
const linearToSrgb = (x: number) => {
	return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055
}

// Step 4: sRGB → hex
const toHex = (x: number) => {
	const hex = Math.round(x * 255)
		.toString(16)
		.padStart(2, '0')
	return hex
}

const oklchToHex = (raw: string) => {
	const match = raw.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/)

	if (!match) {
		return raw
	}

	const l = parseFloat(match[1]) / 100
	const c = parseFloat(match[2])
	const h = parseFloat(match[3])

	// Convert h from degrees to radians
	const hRad = (h * Math.PI) / 180

	// Step 1: OKLCH → OKLab
	const aa = c * Math.cos(hRad)
	const bb = c * Math.sin(hRad)

	// Step 2: OKLab → linear sRGB
	const l_ = l + 0.3963377774 * aa + 0.2158037573 * bb
	const m_ = l - 0.1055613458 * aa - 0.0638541728 * bb
	const s_ = l - 0.0894841775 * aa - 1.291485548 * bb

	const l_cubed = l_ ** 3
	const m_cubed = m_ ** 3
	const s_cubed = s_ ** 3

	const r_linear = +4.0767416621 * l_cubed - 3.3077115913 * m_cubed + 0.2309699292 * s_cubed
	const g_linear = -1.2684380046 * l_cubed + 2.6097574011 * m_cubed - 0.3413193965 * s_cubed
	const b_linear = -0.0041960863 * l_cubed - 0.7034186147 * m_cubed + 1.707614701 * s_cubed

	const r = Math.max(0, Math.min(1, linearToSrgb(r_linear)))
	const g = Math.max(0, Math.min(1, linearToSrgb(g_linear)))
	const b = Math.max(0, Math.min(1, linearToSrgb(b_linear)))

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Darkens a THREE.Color by a given percentage while preserving hue.
 * @param color The original THREE.Color instance.
 * @param percent The percentage to darken (0-100).
 * @returns A new THREE.Color instance with the darkened color.
 */
export const darkenColor = (value: ColorRepresentation, percent: number): Color => {
	const original = new Color(value)
	const hsl = original.getHSL({ h: 0, s: 0, l: 0 })
	hsl.l = Math.max(0, hsl.l * (1 - percent / 100))
	return new Color().setHSL(hsl.h, hsl.s, hsl.l)
}

export const colors = {
	selected: oklchToHex(twColors.red['900']),
	default: oklchToHex(twColors.red['500']),
	arm: {
		selected: oklchToHex(twColors.amber['900']),
		default: oklchToHex(twColors.amber['500']),
	},
	base: {
		selected: oklchToHex(twColors.slate['900']),
		default: oklchToHex(twColors.slate['500']),
	},
	board: {
		selected: oklchToHex(twColors.emerald['900']),
		default: oklchToHex(twColors.emerald['500']),
	},
	button: {
		selected: oklchToHex(twColors.gray['900']),
		default: oklchToHex(twColors.gray['500']),
	},
	camera: {
		selected: oklchToHex(twColors.blue['900']),
		default: oklchToHex(twColors.blue['500']),
	},
	encoder: {
		selected: oklchToHex(twColors.lime['900']),
		default: oklchToHex(twColors.lime['500']),
	},
	gantry: {
		selected: oklchToHex(twColors.purple['900']),
		default: oklchToHex(twColors.purple['500']),
	},
	gripper: {
		selected: oklchToHex(twColors.cyan['900']),
		default: oklchToHex(twColors.cyan['500']),
	},
	motor: {
		selected: oklchToHex(twColors.orange['900']),
		default: oklchToHex(twColors.orange['500']),
	},
	movement_sensor: {
		selected: oklchToHex(twColors.indigo['900']),
		default: oklchToHex(twColors.indigo['500']),
	},
	pose_tracker: {
		selected: oklchToHex(twColors.rose['900']),
		default: oklchToHex(twColors.rose['500']),
	},
	power_sensor: {
		selected: oklchToHex(twColors.violet['900']),
		default: oklchToHex(twColors.violet['500']),
	},
	sensor: {
		selected: oklchToHex(twColors.teal['900']),
		default: oklchToHex(twColors.teal['500']),
	},
	servo: {
		selected: oklchToHex(twColors.yellow['900']),
		default: oklchToHex(twColors.yellow['500']),
	},
	switch: {
		selected: oklchToHex(twColors.stone['900']),
		default: oklchToHex(twColors.stone['500']),
	},
	webcam: {
		selected: oklchToHex(twColors.sky['900']),
		default: oklchToHex(twColors.sky['500']),
	},
	unnamed_geometry: {
		selected: oklchToHex(twColors.neutral['900']),
		default: oklchToHex(twColors.neutral['500']),
	},
} as const

export function getColorGroup(name: string) {
	console.log('getColorGroup called with:', name)
	let type = name.split(/[-:]/)[0].trim().toLowerCase()
	console.log('Extracted type:', type)
	if (type === 'unnamed geometry') type = 'unnamed_geometry'
	const group = colors[type as keyof typeof colors]
	console.log('Color group:', group)
	if (group && typeof group === 'object' && 'selected' in group && 'default' in group) {
		return group
	}
	return {
		selected: colors.selected,
		default: colors.default,
	}
}
