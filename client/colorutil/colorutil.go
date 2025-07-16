package colorutil

import (
	"strings"
)

var Colors = map[string]string{
	"black":                "#000000",
	"white":                "#ffffff",
	"red":                  "#ff0000",
	"green":                "#00ff00",
	"blue":                 "#0000ff",
	"yellow":               "#ffff00",
	"cyan":                 "#00ffff",
	"magenta":              "#ff00ff",
	"gray":                 "#808080",
	"grey":                 "#808080",
	"orange":               "#ffa500",
	"purple":               "#800080",
	"pink":                 "#ffc0cb",
	"brown":                "#a52a2a",
	"lime":                 "#00ff00",
	"navy":                 "#000080",
	"teal":                 "#008080",
	"maroon":               "#800000",
	"olive":                "#808000",
	"silver":               "#c0c0c0",
	"gold":                 "#ffd700",
	"fern":                 "#71bc78",
	"aliceblue":            "#f0f8ff",
	"antiquewhite":         "#faebd7",
	"aqua":                 "#00ffff",
	"aquamarine":           "#7fffd4",
	"azure":                "#f0ffff",
	"beige":                "#f5f5dc",
	"bisque":               "#ffe4c4",
	"blanchedalmond":       "#ffebcd",
	"blueviolet":           "#8a2be2",
	"burlywood":            "#deb887",
	"cadetblue":            "#5f9ea0",
	"chartreuse":           "#7fff00",
	"chocolate":            "#d2691e",
	"coral":                "#ff7f50",
	"cornflowerblue":       "#6495ed",
	"cornsilk":             "#fff8dc",
	"crimson":              "#dc143c",
	"darkblue":             "#00008b",
	"darkcyan":             "#008b8b",
	"darkgoldenrod":        "#b8860b",
	"darkgray":             "#a9a9a9",
	"darkgreen":            "#006400",
	"darkgrey":             "#a9a9a9",
	"darkkhaki":            "#bdb76b",
	"darkmagenta":          "#8b008b",
	"darkolivegreen":       "#556b2f",
	"darkorange":           "#ff8c00",
	"darkorchid":           "#9932cc",
	"darkred":              "#8b0000",
	"darksalmon":           "#e9967a",
	"darkseagreen":         "#8fbc8f",
	"darkslateblue":        "#483d8b",
	"darkslategray":        "#2f4f4f",
	"darkslategrey":        "#2f4f4f",
	"darkturquoise":        "#00ced1",
	"darkviolet":           "#9400d3",
	"deeppink":             "#ff1493",
	"deepskyblue":          "#00bfff",
	"dimgray":              "#696969",
	"dimgrey":              "#696969",
	"dodgerblue":           "#1e90ff",
	"firebrick":            "#b22222",
	"floralwhite":          "#fffaf0",
	"forestgreen":          "#228b22",
	"fuchsia":              "#ff00ff",
	"gainsboro":            "#dcdcdc",
	"ghostwhite":           "#f8f8ff",
	"goldenrod":            "#daa520",
	"greenyellow":          "#adff2f",
	"honeydew":             "#f0fff0",
	"hotpink":              "#ff69b4",
	"indianred":            "#cd5c5c",
	"indigo":               "#4b0082",
	"ivory":                "#fffff0",
	"khaki":                "#f0e68c",
	"lavender":             "#e6e6fa",
	"lavenderblush":        "#fff0f5",
	"lawngreen":            "#7cfc00",
	"lemonchiffon":         "#fffacd",
	"lightblue":            "#add8e6",
	"lightcoral":           "#f08080",
	"lightcyan":            "#e0ffff",
	"lightgoldenrodyellow": "#fafad2",
	"lightgray":            "#d3d3d3",
	"lightgreen":           "#90ee90",
	"lightgrey":            "#d3d3d3",
	"lightpink":            "#ffb6c1",
	"lightsalmon":          "#ffa07a",
	"lightseagreen":        "#20b2aa",
	"lightskyblue":         "#87cefa",
	"lightslategray":       "#778899",
	"lightslategrey":       "#778899",
	"lightsteelblue":       "#b0c4de",
	"lightyellow":          "#ffffe0",
	"limegreen":            "#32cd32",
	"linen":                "#faf0e6",
	"mediumaquamarine":     "#66cdaa",
	"mediumblue":           "#0000cd",
	"mediumorchid":         "#ba55d3",
	"mediumpurple":         "#9370db",
	"mediumseagreen":       "#3cb371",
	"mediumslateblue":      "#7b68ee",
	"mediumspringgreen":    "#00fa9a",
	"mediumturquoise":      "#48d1cc",
	"mediumvioletred":      "#c71585",
	"midnightblue":         "#191970",
	"mintcream":            "#f5fffa",
	"mistyrose":            "#ffe4e1",
	"moccasin":             "#ffe4b5",
	"navajowhite":          "#ffdead",
	"oldlace":              "#fdf5e6",
	"olivedrab":            "#6b8e23",
	"orangered":            "#ff4500",
	"orchid":               "#da70d6",
	"palegoldenrod":        "#eee8aa",
	"palegreen":            "#98fb98",
	"paleturquoise":        "#afeeee",
	"palevioletred":        "#db7093",
	"papayawhip":           "#ffefd5",
	"peachpuff":            "#ffdab9",
	"peru":                 "#cd853f",
	"plum":                 "#dda0dd",
	"powderblue":           "#b0e0e6",
	"rebeccapurple":        "#663399",
	"rosybrown":            "#bc8f8f",
	"royalblue":            "#4169e1",
	"saddlebrown":          "#8b4513",
	"salmon":               "#fa8072",
	"sandybrown":           "#f4a460",
	"seagreen":             "#2e8b57",
	"seashell":             "#fff5ee",
	"sienna":               "#a0522d",
	"skyblue":              "#87ceeb",
	"slateblue":            "#6a5acd",
	"slategray":            "#708090",
	"slategrey":            "#708090",
	"snow":                 "#fffafa",
	"springgreen":          "#00ff7f",
	"steelblue":            "#4682b4",
	"tan":                  "#d2b48c",
	"thistle":              "#d8bfd8",
	"tomato":               "#ff6347",
	"turquoise":            "#40e0d0",
	"violet":               "#ee82ee",
	"wheat":                "#f5deb3",
	"whitesmoke":           "#f5f5f5",
	"yellowgreen":          "#9acd32",
}

// NamedColorToHex returns the hex string for a given named color.
// For unsupported colors, it returns an error.
func NamedColorToHex(name string) string {
	if strings.HasPrefix(name, "#") {
		return name
	}

	name = strings.ToLower(strings.TrimSpace(name))

	hex, ok := Colors[name]
	if !ok {
		return Colors["black"]
	}
	return hex
}

func NamedColorsToHexes(names []string) []string {
	var hexes []string
	for _, name := range names {
		name = strings.ToLower(name)
		if strings.HasPrefix(name, "#") && len(name) == 7 {
			// Already a hex code, just add it
			hexes = append(hexes, name)
		} else if hex, ok := Colors[name]; ok {
			// It's a named color, map it
			hexes = append(hexes, hex)
		} else {
			// Unknown value, fallback to black
			hexes = append(hexes, Colors["black"])
		}
	}
	return hexes
}
